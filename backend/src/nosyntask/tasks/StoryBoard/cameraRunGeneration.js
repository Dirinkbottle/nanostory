/**
 * 精细动态运镜提示词生成处理器
 * 
 * 基于电影学运镜理论，结合分镜描述、首尾帧、endState、上下文镜头信息，
 * 为每个镜头生成精细的动态运镜提示词（英文），直接用于视频生成模型。
 * 
 * 输入：
 *   - storyboardId: 分镜 ID
 *   - textModel: 文本模型名称
 *   - firstFrameUrl: 首帧图片 URL（可选，用于理解画面构图）
 *   - lastFrameUrl: 尾帧图片 URL（可选，动作镜头）
 *   图片参数会自动派生
 * 输出：
 *   - cameraRunPrompt: 精细运镜英文提示词
 *   - cameraRunAnalysis: 运镜分析（中文，供调试）
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');
const { queryOne, queryAll, execute } = require('../../../dbHelper');
const { requireVisualStyle } = require('../../../utils/getProjectStyle');

async function handleCameraRunGeneration(inputParams, onProgress) {
  const { storyboardId, textModel, think } = inputParams;

  if (!storyboardId) throw new Error('缺少必要参数: storyboardId');
  if (!textModel) throw new Error('textModel 参数是必需的');

  console.log('[CameraRunGen] 开始生成精细运镜, storyboardId:', storyboardId);
  if (onProgress) onProgress(5);

  // 1. 查询当前分镜数据
  const storyboard = await queryOne('SELECT * FROM storyboards WHERE id = ?', [storyboardId]);
  if (!storyboard) throw new Error(`分镜 ${storyboardId} 不存在`);

  const visualStyle = await requireVisualStyle(storyboard.project_id);

  let variables = {};
  try {
    variables = typeof storyboard.variables_json === 'string'
      ? JSON.parse(storyboard.variables_json || '{}')
      : (storyboard.variables_json || {});
  } catch (e) { variables = {}; }

  const description = storyboard.prompt_template || '';
  const hasAction = variables.hasAction || false;
  const shotType = variables.shotType || '';
  const emotion = variables.emotion || '';
  const cameraMovement = variables.cameraMovement || '';
  const endState = variables.endState || '';
  const startFrameDesc = variables.startFrame || '';
  const endFrameDesc = variables.endFrame || '';
  const dialogue = variables.dialogue || '';
  const duration = variables.duration || (hasAction ? 3 : 2);
  const firstFrameUrl = storyboard.first_frame_url || null;
  const lastFrameUrl = storyboard.last_frame_url || null;

  if (onProgress) onProgress(10);

  // 2. 查询上下文镜头（前一个和后一个）
  let prevShot = null;
  let nextShot = null;
  const scriptId = storyboard.script_id;
  const currentIdx = storyboard.idx;

  if (scriptId != null && currentIdx != null) {
    const neighbors = await queryAll(
      'SELECT idx, prompt_template, variables_json, first_frame_url, last_frame_url FROM storyboards WHERE script_id = ? AND idx IN (?, ?) ORDER BY idx ASC',
      [scriptId, currentIdx - 1, currentIdx + 1]
    );
    for (const nb of neighbors) {
      let nbVars = {};
      try {
        nbVars = typeof nb.variables_json === 'string'
          ? JSON.parse(nb.variables_json || '{}')
          : (nb.variables_json || {});
      } catch (e) { nbVars = {}; }

      const shotData = {
        description: nb.prompt_template || '',
        shotType: nbVars.shotType || '',
        endState: nbVars.endState || '',
        cameraMovement: nbVars.cameraMovement || '',
        hasAction: nbVars.hasAction || false,
        emotion: nbVars.emotion || '',
        firstFrameUrl: nb.first_frame_url || null,
        lastFrameUrl: nb.last_frame_url || null
      };

      if (nb.idx === currentIdx - 1) prevShot = shotData;
      if (nb.idx === currentIdx + 1) nextShot = shotData;
    }
  }

  if (onProgress) onProgress(20);

  // 3. 查询角色外貌信息
  const charNames = variables.characters || [];
  let characterAppearance = '';
  if (charNames.length > 0) {
    try {
      const linkedChar = await queryOne(
        `SELECT c.appearance FROM storyboard_characters sc
         JOIN characters c ON sc.character_id = c.id
         WHERE sc.storyboard_id = ? AND c.name = ?`,
        [storyboardId, charNames[0]]
      );
      if (linkedChar) characterAppearance = linkedChar.appearance || '';
    } catch (e) { /* 忽略 */ }
  }

  if (onProgress) onProgress(30);

  // 4. 构建精细运镜提示词请求
  const isFirstShot = (currentIdx === 0 || currentIdx === null);

  // 上一镜头上下文
  const prevContext = prevShot
    ? `【上一镜头（第${currentIdx}镜）】
描述: ${prevShot.description}
景别: ${prevShot.shotType}
运镜: ${prevShot.cameraMovement || 'static'}
结束状态: ${prevShot.endState}
情绪: ${prevShot.emotion}
${prevShot.hasAction ? '（动作镜头）' : '（静态镜头）'}`
    : (isFirstShot ? '【这是第一个镜头，没有前序镜头】' : '【上一镜头信息不可用】');

  // 下一镜头上下文
  const nextContext = nextShot
    ? `【下一镜头（第${currentIdx + 2}镜）】
描述: ${nextShot.description}
景别: ${nextShot.shotType}
运镜: ${nextShot.cameraMovement || 'static'}
情绪: ${nextShot.emotion}`
    : '【这是最后一个镜头或下一镜头信息不可用】';

  // 当前镜头信息
  const currentShotInfo = `【当前镜头（第${currentIdx + 1}镜）】
描述: ${description}
景别: ${shotType}
基础运镜方向: ${cameraMovement || 'static'}
是否有动作: ${hasAction ? '是' : '否'}
${hasAction ? `首帧描述: ${startFrameDesc}\n尾帧描述: ${endFrameDesc}` : ''}
结束状态: ${endState}
情绪氛围: ${emotion}
对白: ${dialogue || '无'}
建议时长: ${duration}秒
${charNames.length > 0 ? `角色: ${charNames.join('、')}` : '无角色（空镜头）'}
${characterAppearance ? `角色外貌: ${characterAppearance}` : ''}
视觉风格: ${visualStyle}`;

  // 首尾帧参考说明
  const frameRefInfo = firstFrameUrl
    ? `【参考帧信息】
- 首帧已生成（画面起点）${lastFrameUrl ? '\n- 尾帧已生成（画面终点，动作镜头）' : ''}
- 运镜提示词必须描述从首帧到${lastFrameUrl ? '尾帧' : '镜头结束'}的完整镜头运动过程`
    : '【无参考帧，仅根据描述生成运镜】';

  const fullPrompt = `你是一位资深电影摄影指导（Cinematographer），精通以下运镜理论：

【电影运镜知识库】
1. **推拉运镜（Dolly/Zoom）**：
   - Dolly In（物理推近）：营造亲密感、紧迫感，观众被"拉入"场景
   - Dolly Out（物理拉远）：揭示环境、制造疏离感或孤独感
   - Zoom In/Out（变焦）：不改变透视关系，用于强调或戏剧性揭示
   - Dolly Zoom（眩晕效果）：推近+变焦拉远（或反向），制造不安感

2. **摇移运镜（Pan/Tilt/Track）**：
   - Pan（水平摇）：跟随角色视线或扫视环境，速度决定节奏
   - Tilt（垂直摇）：仰拍展现威严/渺小，俯拍展现全局/脆弱
   - Track（横移）：平行跟随角色，营造同行感
   - Arc/Orbit（弧形环绕）：围绕主体旋转，增加戏剧张力

3. **升降运镜（Crane/Jib）**：
   - Crane Up：从低处升起，揭示全景或表达希望/解放
   - Crane Down：从高处降落，聚焦细节或表达压迫/命运

4. **手持与稳定器**：
   - Handheld（手持）：轻微晃动营造纪实感、紧张感
   - Steadicam（稳定器跟随）：流畅跟随长镜头

5. **运镜节奏原则**：
   - 慢速运镜：沉思、悲伤、宁静
   - 中速运镜：叙事、日常
   - 快速运镜：紧张、动作、惊恐
   - 突然停止：震惊、发现
   - 加速运镜：紧迫感递增

6. **镜头衔接运镜原则**：
   - 上一镜头结束的运动方向应与下一镜头开始的运动方向有逻辑关系
   - 同方向衔接：流畅连贯
   - 反方向衔接：制造对比或转折
   - 静→动：引入新事件
   - 动→静：情绪沉淀

---

${prevContext}

${currentShotInfo}

${nextContext}

${frameRefInfo}

---

请为当前镜头生成精细的动态运镜提示词。

【输出要求】
1. 输出一段英文运镜提示词（camera movement prompt），直接用于视频生成AI
2. 提示词必须包含：
   - 镜头运动类型和方向以及旋转角度（如 "slow dolly in", "smooth pan left to right"）
   - 运动速度和节奏（如 "gradually accelerating", "steady pace"）
   - 运动的起止状态（如 "starting from a wide establishing shot, ending on a close-up of the character's face"）
   - 如果有角色动作，描述角色动作与镜头运动的配合关系
   - 如果有对白，描述嘴型和表情变化
3. 运镜必须与上一镜头的结束状态自然衔接（如果有上一镜头）
4. 运镜结束时画面必须呈现 endState 描述的状态
5. 运镜风格要匹配情绪氛围
6. 时长约 ${duration} 秒，运镜节奏要匹配这个时长
7. 不要输出任何解释，只输出英文运镜提示词

【格式】
直接输出英文提示词，一段话，不要分行，不要编号，不要标题。`;

  if (onProgress) onProgress(40);

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel,
    maxTokens: 600,
    temperature: 0.6,
    think
  });

  const cameraRunPrompt = (result.content || '').trim();
  console.log('[CameraRunGen] 运镜提示词:', cameraRunPrompt.substring(0, 120) + '...');

  if (onProgress) onProgress(90);

  // 5. 保存运镜提示词到 variables_json
  try {
    variables.cameraRunPrompt = cameraRunPrompt;
    await execute(
      'UPDATE storyboards SET variables_json = ? WHERE id = ?',
      [JSON.stringify(variables), storyboardId]
    );
    console.log('[CameraRunGen] 运镜提示词已保存到 variables_json');
  } catch (e) {
    console.warn('[CameraRunGen] 保存运镜提示词失败:', e.message);
  }

  if (onProgress) onProgress(100);

  return {
    cameraRunPrompt,
    storyboardId,
    shotType,
    cameraMovement,
    duration
  };
}

module.exports = handleCameraRunGeneration;
