/**
 * 场景状态分析处理器（Continuity Agent）
 * 独立的 AI 调用，分析每个镜头的环境状态变化
 * 
 * 核心职责：
 * - 追踪每个镜头的环境是否发生不可逆变化（物品损坏/移位、门窗开关、灯光变化等）
 * - 为每个镜头标注 scene_state（normal/modified/inherit）
 * - 生成英文 environment_change 描述，直接用于后续帧生成提示词
 * - 结果写入每个分镜的 variables_json
 * 
 * input:  { scriptId, textModel }
 * output: { total, updated, results[] }
 */

const { queryAll, execute, queryOne } = require('../../../dbHelper');
const handleBaseTextModelCall = require('../base/baseTextModelCall');
const { washForJSON } = require('../../../utils/washBody');

async function handleSceneStateAnalysis(inputParams, onProgress) {
  const { scriptId, textModel, think } = inputParams;

  if (!scriptId) {
    throw new Error('缺少必要参数: scriptId');
  }
  if (!textModel) {
    throw new Error('textModel 参数是必需的');
  }

  console.log('[SceneStateAnalysis] 开始场景状态分析，scriptId:', scriptId);
  if (onProgress) onProgress(5);

  // 1. 查询所有分镜（按顺序）
  const storyboards = await queryAll(
    'SELECT id, idx, prompt_template, variables_json FROM storyboards WHERE script_id = ? ORDER BY idx ASC',
    [scriptId]
  );

  if (!storyboards || storyboards.length === 0) {
    throw new Error('该剧本下没有分镜数据');
  }

  // 2. 提取分析所需的精简数据
  const shotsForAnalysis = storyboards.map((sb, i) => {
    let vars = {};
    try {
      vars = typeof sb.variables_json === 'string'
        ? JSON.parse(sb.variables_json || '{}')
        : (sb.variables_json || {});
    } catch (e) { vars = {}; }

    return {
      order: i + 1,
      storyboardId: sb.id,
      location: vars.location || '未知',
      description: sb.prompt_template || '',
      endState: vars.endState || '',
      hasAction: vars.hasAction || false
    };
  });

  if (onProgress) onProgress(10);

  // 3. 构建分析 prompt
  const shotsText = shotsForAnalysis.map(s =>
    `镜头${s.order} [场景: ${s.location}] [动作: ${s.hasAction ? '有' : '无'}]\n  描述: ${s.description}\n  结束状态: ${s.endState}`
  ).join('\n\n');

  const fullPrompt = `你是一个专业的电影场记员（Script Supervisor），负责追踪每个镜头的环境状态变化。

【任务】
分析以下分镜序列，为每个镜头标注环境状态。你需要关注的是**场景环境**的物理变化，不是角色姿势变化。

【分镜数据】
${shotsText}

【输出规则】
为每个镜头输出一个 JSON 对象，包含：

1. **order**: 镜头序号（与输入一致）
2. **scene_state**: 三选一
   - "normal": 环境未发生任何不可逆变化，与该场景最初状态一致
   - "modified": **本镜头中**环境发生了不可逆的物理变化（物品被打翻/打碎/移位、门窗开关状态改变、灯光开关、火焰点燃/熄灭、液体泼洒等）
   - "inherit": 环境已在之前的镜头中被改变，本镜头继承该改变后的状态（环境本身没有新的变化）

3. **environment_change**: 英文描述，具体说明环境变化内容
   - normal → "none"
   - modified → 具体描述本镜头发生的变化，如 "Cup shattered on floor, coffee spilled across tiles"
   - inherit → 描述需要保持的已有变化，如 "Broken cup remains on floor, coffee stain visible on tiles"

4. **visual_anchor**: 英文，该镜头画面中最重要的视觉焦点元素（帮助图片模型聚焦）

【关键判断标准】
- 只有物理状态的不可逆变化才标 "modified"（物品损坏、位移、液体泼洒、门窗开关等）
- 角色的姿势/位置/表情变化**不算**环境变化
- 自然光照渐变（黄昏→夜晚）、天气转变（晴→雨）标 "modified"
- **同一 location 的状态是累积的**：一旦某个 location 被标为 modified，后续同 location 镜头如果没有新变化必须是 "inherit"
- **不同 location 之间互不影响**：厨房的杯子碎了不影响卧室的状态
- 第一个镜头通常是 "normal"（除非描述中明确提到环境已处于异常状态）

**重要：必须输出严格的 JSON 数组格式！**
只输出 JSON 数组，不要其他内容。示例：
[
  {"order": 1, "scene_state": "normal", "environment_change": "none", "visual_anchor": "Tidy desk with a steaming coffee cup"},
  {"order": 2, "scene_state": "modified", "environment_change": "Cup shattered on floor, coffee spilled across tiles", "visual_anchor": "Broken cup fragments on the floor"},
  {"order": 3, "scene_state": "inherit", "environment_change": "Broken cup remains on floor, coffee stain visible", "visual_anchor": "Character staring at the mess on the floor"}
]`;

  console.log('[SceneStateAnalysis] 分析', shotsForAnalysis.length, '个镜头的环境状态...');
  if (onProgress) onProgress(20);

  // 4. 调用文本模型
  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel,
    think,
    temperature: 0.2
  });

  if (onProgress) onProgress(60);

  // 5. 解析结果
  let analysisResults = [];
  try {
    const parsed = washForJSON(result.content);
    if (Array.isArray(parsed)) {
      analysisResults = parsed;
      console.log('[SceneStateAnalysis] ✅ 解析成功，共', analysisResults.length, '条结果');
    } else {
      console.warn('[SceneStateAnalysis] 解析结果非数组，内容为空或截断');
    }
  } catch (e) {
    console.error('[SceneStateAnalysis] ❌ 解析失败:', e.message);
  }

  // 5.1 空结果回退：关闭 thinking 重试一次
  if (analysisResults.length === 0 && think) {
    console.log('[SceneStateAnalysis] 思考模式输出为空，关闭 thinking 重试...');
    const retryResult = await handleBaseTextModelCall({
      prompt: fullPrompt,
      textModel,
      think: false,
      temperature: 0.2
    });
    try {
      const retryParsed = washForJSON(retryResult.content);
      if (Array.isArray(retryParsed)) {
        analysisResults = retryParsed;
        console.log('[SceneStateAnalysis] ✅ 重试解析成功，共', analysisResults.length, '条结果');
      }
    } catch (e2) {
      console.error('[SceneStateAnalysis] ❌ 重试解析也失败:', e2.message);
    }
  }

  if (onProgress) onProgress(70);

  // 6. 写入每个分镜的 variables_json
  let updated = 0;
  const results = [];

  for (const shot of shotsForAnalysis) {
    const analysis = analysisResults.find(a => a.order === shot.order);
    if (!analysis) {
      console.warn(`[SceneStateAnalysis] 镜头${shot.order} 未找到分析结果，跳过`);
      results.push({ storyboardId: shot.storyboardId, order: shot.order, status: 'skipped' });
      continue;
    }

    // 验证 scene_state 值的合法性
    const validStates = ['normal', 'modified', 'inherit'];
    const sceneState = validStates.includes(analysis.scene_state) ? analysis.scene_state : 'normal';

    try {
      // 读取当前 variables_json
      const sb = await queryOne('SELECT variables_json FROM storyboards WHERE id = ?', [shot.storyboardId]);
      let vars = {};
      try {
        vars = typeof sb.variables_json === 'string'
          ? JSON.parse(sb.variables_json || '{}')
          : (sb.variables_json || {});
      } catch (e) { vars = {}; }

      // 写入新字段
      vars.scene_state = sceneState;
      vars.environment_change = analysis.environment_change || 'none';
      vars.visual_anchor = analysis.visual_anchor || '';

      await execute(
        'UPDATE storyboards SET variables_json = ? WHERE id = ?',
        [JSON.stringify(vars), shot.storyboardId]
      );

      updated++;
      results.push({
        storyboardId: shot.storyboardId,
        order: shot.order,
        status: 'updated',
        scene_state: sceneState,
        environment_change: vars.environment_change
      });

      console.log(`[SceneStateAnalysis] 镜头${shot.order} → ${sceneState} | ${vars.environment_change}`);
    } catch (err) {
      console.error(`[SceneStateAnalysis] 镜头${shot.order} 写入失败:`, err.message);
      results.push({ storyboardId: shot.storyboardId, order: shot.order, status: 'failed', error: err.message });
    }
  }

  if (onProgress) onProgress(100);
  console.log(`[SceneStateAnalysis] 完成: 总计=${shotsForAnalysis.length}, 更新=${updated}`);

  return {
    total: shotsForAnalysis.length,
    updated,
    results
  };
}

module.exports = handleSceneStateAnalysis;
