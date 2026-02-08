/**
 * 自动分镜处理器
 * 调用文本模型将剧本内容拆分为分镜镜头列表
 * 
 * input:  { scriptContent, scriptTitle, textModel }
 * output: { scenes: [...], count }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');
const handleRepairJsonResponse = require('./repairJsonResponse');

async function handleStoryboardGeneration(inputParams, onProgress) {
  const { scriptContent, scriptTitle, textModel, modelName: _legacy } = inputParams;
  const modelName = textModel || _legacy;

  if (!scriptContent || scriptContent.trim() === '') {
    throw new Error('剧本内容为空，无法生成分镜');
  }

  if (!modelName) {
    throw new Error('textModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  const fullPrompt = `你是一个专业的电影分镜师。你的任务是将剧本极度细化为分镜，每个镜头只展示一个静止画面。规则：1）每句对白独立一个镜头；2）每个动作分解为准备-进行-结果；3）场景切换要从远到近层层推进；4）一个剧本场景至少拆成5-10个镜头；5）【关键】每个镜头最多只能出现一个角色，如果场景中有多个角色互动，必须拆分为多个镜头（例如A和B对话→镜头1:A说话特写→镜头2:B反应特写→镜头3:A回应），characters数组最多只能有1个元素或为空。

**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹，例如 "description": "这是描述"
- 不要输出 "description": 这是描述（缺少引号）
- 确保 JSON 格式完整，以 ] 结尾
- 只输出 JSON 数组，不要添加其他说明文字

---

请根据以下剧本内容，将其细化为电影级分镜镜头。

【剧本内容】
${scriptContent}

【核心要求 - 极度细化】
1. 每个分镜 = 一个静止画面，可直接生成一张图片
2. 【最重要】每个镜头最多只能有1个角色（characters数组长度≤1）：
   - 多角色互动必须拆成多个单人镜头交替呈现
   - 无角色的空镜头（如风景、物品特写）characters为空数组[]
   - 绝对禁止一个镜头出现2个或以上角色
3. 对话场景必须拆分：
   - 每句对白一个镜头（说话人特写，只包含说话人）
   - 穿插听者反应镜头（只包含听者）
   - 适时加入无人的场景全景空镜头
4. 动作场景必须拆分：
   - 动作准备阶段
   - 动作进行中
   - 动作结果
5. 场景切换时：
   - 先用远景/全景建立新场景（无角色空镜头）
   - 再逐步推近到角色
6. 情绪变化点要单独一个特写镜头
7. 数量要求：一个场景至少拆成 5-10 个镜头

【输出 JSON 格式】
每个分镜包含：
- order: 分镜序号（从1开始）
- shotType: 镜头类型（"特写"/"近景"/"中景"/"全景"/"远景"/"俯拍"/"仰拍"/"过肩"）
- description: 画面描述（详细描述画面内容，要足够详细，可直接用于AI生图）
- hasAction: 是否有动作（true/false）
- startFrame: 首帧描述（仅当hasAction=true时）
- endFrame: 尾帧描述（仅当hasAction=true时）
- dialogue: 对白内容（如果有）
- duration: 建议时长（秒）
- characters: 出现的角色数组（**最多1个元素**，如["主角"]或[]，禁止出现2个以上角色）
- location: 场景地点
- emotion: 情绪氛围

只输出 JSON 数组，不要其他内容。示例（注意每个镜头最多1个角色）：
[
  {"order": 1, "shotType": "远景", "description": "清晨的城市天际线，高楼大厦沐浴在金色晨光中", "hasAction": false, "dialogue": "", "duration": 2, "characters": [], "location": "城市外景", "emotion": "平静"},
  {"order": 2, "shotType": "近景", "description": "主角侧脸特写，眼神望向窗外，晨光映照在脸上", "hasAction": true, "startFrame": "主角侧脸望向窗外", "endFrame": "主角缓缓转头看向镜头", "dialogue": "新的一天又开始了...", "duration": 3, "characters": ["主角"], "location": "办公室", "emotion": "沉思"},
  {"order": 3, "shotType": "特写", "description": "小美抬头看向主角，露出微笑", "hasAction": false, "dialogue": "早上好啊！", "duration": 2, "characters": ["小美"], "location": "办公室", "emotion": "愉快"}
]`;

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel: modelName,
    maxTokens: 8192,
    temperature: 0.3
  }, onProgress);

  if (onProgress) onProgress(80);

  // 解析 AI 返回的 JSON
  let scenes = [];
  try {
    let jsonStr = result.content;
    
    console.log('[StoryboardGen] 响应总长度:', jsonStr.length, '字符');
    console.log('[StoryboardGen] 原始响应 (前200字符):', jsonStr.substring(0, 200));
    console.log('[StoryboardGen] 原始响应 (后200字符):', jsonStr.substring(Math.max(0, jsonStr.length - 200)));

    // 1. 先处理 <think> 标签
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // 2. 处理 markdown 代码块包裹 (```json ... ``` 或 ``` ... ```)
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
      console.log('[StoryboardGen] 提取代码块后长度:', jsonStr.length, '字符');
    }
    
    // 3. 移除可能的前导/尾随空白和换行
    jsonStr = jsonStr.trim();
    
    // 4. 尝试直接解析
    try {
      scenes = JSON.parse(jsonStr);
      console.log('[StoryboardGen] ✅ 直接解析成功，共', scenes.length, '个分镜');
    } catch (directParseError) {
      console.log('[StoryboardGen] 直接解析失败，使用 jsonrepair 修复...');
      
      // 5. 使用 jsonrepair 库修复（处理缺失括号、引号、多余逗号等）
      try {
        const { jsonrepair } = await import('jsonrepair');
        const repaired = jsonrepair(jsonStr);
        scenes = JSON.parse(repaired);
        console.log('[StoryboardGen] ✅ jsonrepair 修复成功，共', scenes.length, '个分镜');
      } catch (repairLibError) {
        console.error('[StoryboardGen] ❌ jsonrepair 修复失败:', repairLibError.message);
        
        // 6. 最后手段：调用 AI 修复
        console.log('[StoryboardGen] 🔧 调用 AI 修复任务...');
        try {
          const repairResult = await handleRepairJsonResponse({
            incompleteJson: jsonStr,
            originalPrompt: fullPrompt,
            textModel: modelName
          }, (progress) => {
            if (onProgress) onProgress(80 + progress * 0.15);
          });
          
          if (repairResult.success && repairResult.repairedJson) {
            scenes = repairResult.repairedJson;
            console.log('[StoryboardGen] ✅ AI 修复成功，共', scenes.length, '个分镜');
          } else {
            throw new Error('AI 修复也失败: ' + (repairResult.error || directParseError.message));
          }
        } catch (aiRepairError) {
          console.error('[StoryboardGen] ❌ AI 修复失败:', aiRepairError);
          throw new Error('分镜 JSON 解析失败，jsonrepair 和 AI 修复均失败: ' + directParseError.message);
        }
      }
    }
  } catch (parseError) {
    console.error('[StoryboardGen] 解析分镜 JSON 失败:', parseError);
    console.error('[StoryboardGen] 完整响应内容:', result.content);
    throw new Error('分镜解析失败: ' + parseError.message);
  }

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('AI 未返回有效的分镜数据');
  }

  if (onProgress) onProgress(100);

  return {
    scenes,
    count: scenes.length,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown'
  };
}

module.exports = handleStoryboardGeneration;
