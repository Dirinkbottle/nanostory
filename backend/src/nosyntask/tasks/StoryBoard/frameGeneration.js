/**
 * 分镜首尾帧生成处理器（动作镜头）
 * 
 * 流程：
 * 1. 查询分镜数据，获取角色列表和场景名称
 * 2. 校验：多角色镜头直接阻止（当前仅支持单角色）
 * 3. 查询角色正面图 URL + 场景图 URL，拼接为 imageUrls 参考数组
 * 4. 如果有上一镜头尾帧（prevEndFrameUrl），加入参考图列表以保持连续性
 * 5. 调用文本模型，根据镜头描述 + 上一镜头上下文生成首帧提示词
 * 6. 以 imageUrls + 首帧提示词 调用图片模型生成首帧，保存到数据库
 * 7. 调用文本模型，根据镜头描述生成尾帧提示词
 * 8. 以 [首帧] + 尾帧提示词 调用图片模型生成尾帧，保存到数据库
 * 
 * input:  { storyboardId, prompt, imageModel, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene }
 * output: { startFrame, endFrame, model, startPrompt, endPrompt }
 */

const { submitAndPoll } = require('../pollUtils');
const { execute, queryOne, queryAll } = require('../../../dbHelper');
const { downloadAndStore } = require('../../../utils/fileStorage');
const handleBaseTextModelCall = require('../base/baseTextModelCall');
const { requireVisualStyle } = require('../../../utils/getProjectStyle');

/**
 * 生成单张图片（通过 submitAndPoll 自动处理同步/异步）
 */
async function generateSingleImage(modelName, prompt, width, height, logTag, imageUrls) {
  const submitParams = {
    prompt,
    width: width || 1024,
    height: height || 576,
    imageSize: `${width || 1024}x${height || 576}`,
    aspectRatio: '16:9'
  };

  if (imageUrls && imageUrls.length > 0) {
    submitParams.imageUrls = imageUrls;
  }

  const result = await submitAndPoll(modelName, submitParams, {
    intervalMs: 3000,
    maxDurationMs: 300000,
    logTag: logTag || 'FrameGen'
  });

  const imageUrl = result.image_url || result.imageUrl || result.url || null;
  if (!imageUrl) {
    throw new Error('任务成功但未找到图片 URL');
  }
  return imageUrl;
}

/**
 * 从分镜数据中收集参考图 URL 数组（角色正面图 + 场景图）
 * @returns {{ imageUrls: string[], characterName: string|null, location: string|null }}
 */
async function collectReferenceImages(storyboard, variables) {
  const storyboardId = storyboard.id;
  const characterNames = variables.characters || [];
  const location = variables.location || '';
  const shotType = variables.shotType || '';
  const imageUrls = [];

  function assertNonEmptyString(value, fieldName, entityLabel) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${entityLabel}字段不完整: ${fieldName} 不能为空`);
    }
  }

  // 校验：多角色镜头阻止
  if (characterNames.length > 1) {
    throw new Error(`当前仅支持单角色镜头，该镜头包含 ${characterNames.length} 个角色: ${characterNames.join('、')}。请拆分镜头或手动处理。`);
  }

  if (!location || String(location).trim() === '') {
    throw new Error('该镜头未指定场景：首尾帧生成要求必须提供场景 location');
  }

  // 通过关联表查询角色（含三视图 URL）
  let characterName = null;
  let characterInfo = null; // 角色详细信息，用于提示词
  if (characterNames.length === 1) {
    characterName = characterNames[0];
    const linkedChar = await queryOne(
      `SELECT c.name, c.description, c.appearance, c.personality,
              c.image_url, c.front_view_url, c.side_view_url, c.back_view_url
       FROM storyboard_characters sc
       JOIN characters c ON sc.character_id = c.id
       WHERE sc.storyboard_id = ? AND c.name = ?`,
      [storyboardId, characterName]
    );
    if (!linkedChar) {
      throw new Error(`角色「${characterName}」未与该分镜建立关联。请先运行智能分镜生成以建立资源关联。`);
    }
    assertNonEmptyString(linkedChar.description, 'description', `角色「${characterName}」`);
    assertNonEmptyString(linkedChar.appearance, 'appearance', `角色「${characterName}」`);
    assertNonEmptyString(linkedChar.personality, 'personality', `角色「${characterName}」`);
    assertNonEmptyString(linkedChar.image_url, 'image_url', `角色「${characterName}」`);

    // 保存角色详细信息供提示词使用
    characterInfo = {
      name: linkedChar.name,
      appearance: linkedChar.appearance,
      description: linkedChar.description,
      personality: linkedChar.personality
    };

    // 正面图（主参考图，必须有）
    imageUrls.push(linkedChar.image_url);
    console.log(`[FrameGen] 关联角色「${characterName}」正面图:`, linkedChar.image_url);

    // 根据镜头类型智能加入额外视图参考图
    const shotLower = shotType.toLowerCase();
    if (linkedChar.side_view_url && (shotLower.includes('侧') || shotLower.includes('side'))) {
      imageUrls.push(linkedChar.side_view_url);
      console.log(`[FrameGen] 侧面镜头，加入侧面视图参考:`, linkedChar.side_view_url);
    }
    if (linkedChar.back_view_url && (shotLower.includes('背') || shotLower.includes('back') || shotLower.includes('rear'))) {
      imageUrls.push(linkedChar.back_view_url);
      console.log(`[FrameGen] 背面镜头，加入背面视图参考:`, linkedChar.back_view_url);
    }
  }

  // 通过关联表查询场景
  const linkedScene = await queryOne(
    `SELECT s.name, s.description, s.environment, s.lighting, s.mood, s.image_url
     FROM storyboard_scenes ss
     JOIN scenes s ON ss.scene_id = s.id
     WHERE ss.storyboard_id = ? AND s.name = ?`,
    [storyboardId, location]
  );
  if (!linkedScene) {
    throw new Error(`场景「${location}」未与该分镜建立关联。请先运行智能分镜生成以建立资源关联。`);
  }
  assertNonEmptyString(linkedScene.description, 'description', `场景「${location}」`);
  assertNonEmptyString(linkedScene.environment, 'environment', `场景「${location}」`);
  assertNonEmptyString(linkedScene.lighting, 'lighting', `场景「${location}」`);
  assertNonEmptyString(linkedScene.mood, 'mood', `场景「${location}」`);
  assertNonEmptyString(linkedScene.image_url, 'image_url', `场景「${location}」`);
  imageUrls.push(linkedScene.image_url);
  console.log(`[FrameGen] 关联场景「${location}」图片:`, linkedScene.image_url);

  // 保存场景详细信息供提示词使用
  const sceneInfo = {
    name: linkedScene.name,
    description: linkedScene.description,
    environment: linkedScene.environment,
    lighting: linkedScene.lighting,
    mood: linkedScene.mood
  };

  return { imageUrls, characterName, characterInfo, location, sceneInfo };
}

/**
 * 调用文本模型生成帧提示词
 * @param {object} opts
 * @param {string} opts.textModel
 * @param {string} opts.description - 分镜描述
 * @param {string} opts.frameType - 'start' | 'end'
 * @param {object|null} opts.characterInfo - { name, appearance, description, personality }
 * @param {object|null} opts.sceneInfo - { name, description, environment, lighting, mood }
 * @param {string} opts.shotType
 * @param {string} opts.emotion
 * @param {string} opts.prevDescription
 * @param {string} opts.visualStyle
 * @param {string} [opts.startFrameDesc] - 分镜阶段生成的首帧描述
 * @param {string} [opts.endFrameDesc] - 分镜阶段生成的尾帧描述
 * @param {string} [opts.dialogue] - 角色对白（用于表情/嘴型参考）
 * @param {string} [opts.prevEndState] - 上一镜头的 endState（用于首帧起始状态约束）
 * @param {string} [opts.endState] - 当前镜头的 endState（用于尾帧目标状态）
 */
async function generateFramePrompt(opts) {
  const { textModel, description, frameType, characterInfo, sceneInfo, shotType, emotion, prevDescription, visualStyle, startFrameDesc, endFrameDesc, dialogue, prevEndState, endState } = opts;

  // 角色信息：有角色时提供详细外貌，无角色时明确排除
  let charBlock;
  let charConstraint;
  if (characterInfo) {
    charBlock = `【角色信息】
角色名称: ${characterInfo.name}
外貌特征: ${characterInfo.appearance}
角色描述: ${characterInfo.description}
（已提供角色参考图，画面中的角色必须与参考图完全一致）`;
    charConstraint = `- 角色外貌、服装、发型必须与参考图完全一致，不得自行创造角色形象
- 严禁出现参考图中不存在的额外人物
- 角色身体结构必须正常：头部在肩膀上方，四肢正常连接，禁止畸变`;
  } else {
    charBlock = '【无角色镜头】这个镜头没有任何角色参与';
    charConstraint = `- 画面中绝对不能出现任何人物、人影或人形轮廓
- 仅描述场景环境、自然元素、物体`;
  }

  // 场景信息
  const sceneBlock = sceneInfo
    ? `【场景信息】
场景名称: ${sceneInfo.name}
场景描述: ${sceneInfo.description}
环境: ${sceneInfo.environment}
光照: ${sceneInfo.lighting}
氛围: ${sceneInfo.mood}
（已提供场景参考图，画面场景必须与参考图一致）`
    : '';

  const shotInfo = shotType ? `镜头类型: ${shotType}` : '';
  const emotionInfo = emotion ? `情绪/氛围: ${emotion}` : '';
  const styleInfo = visualStyle ? `视觉风格: ${visualStyle}` : '';

  // 首尾帧文字描述（分镜阶段 AI 生成的）
  const frameDescBlock = frameType === 'start'
    ? (startFrameDesc ? `【首帧参考描述】${startFrameDesc}` : '')
    : (endFrameDesc ? `【尾帧参考描述】${endFrameDesc}` : '');

  // 对白信息（帮助 AI 理解角色表情和嘴型）
  const dialogueBlock = dialogue ? `【角色对白】"${dialogue}"（请根据对白内容调整角色的面部表情和嘴型状态）` : '';

  // 上一镜头结束状态（首帧必须与此衔接）
  const prevEndStateBlock = (frameType === 'start' && prevEndState)
    ? `【上一镜头结束状态 - 必须衔接】\n${prevEndState}\n（当前首帧的角色姿势、位置、朝向必须与上述状态完全一致，不得出现任何跳变）`
    : '';

  // 当前镜头结束状态（尾帧的目标状态）
  const endStateBlock = (frameType === 'end' && endState)
    ? `【本镜头目标结束状态】\n${endState}\n（尾帧画面必须准确呈现上述结束状态）`
    : '';

  // 首尾帧差异化描述：必须让 AI 理解这是动作的两个截然不同的瞬间
  let frameHint;
  let actionDiffConstraint;
  if (frameType === 'start') {
    frameHint = `【首帧 - 动作起始瞬间】
这是动作开始的第一个瞬间。请从分镜描述中提取动作的起点状态：
- 角色的初始姿势、位置、朝向是什么？
- 动作还没有发生，角色处于蓄力/准备状态
- 例如：如果描述是"角色从椅子上站起来走向门口"，首帧应该是"角色坐在椅子上，双手撑着扶手，身体微微前倾准备起身"`;
    actionDiffConstraint = '';
  } else {
    frameHint = `【尾帧 - 动作完成瞬间】
这是动作完成后的最终瞬间。请从分镜描述中提取动作的终点状态：
- 角色的最终姿势、位置、朝向是什么？
- 动作已经完全结束，角色处于动作完成后的状态
- 例如：如果描述是"角色从椅子上站起来走向门口"，尾帧应该是"角色站在门口，一只手搭在门把手上，身体面向门外"

【关于参考图的说明】
你会收到参考图，其中第一张是该动作的首帧（起始状态）。你的任务是：
- 从首帧参考图中提取角色外貌（发型、服装、体型等）和场景环境信息，确保尾帧与首帧保持一致
- 根据分镜描述中的动作幅度，合理调整角色的姿势变化（大动作如奔跑/跳跃需要明显的位置和姿势变化；小动作如拿杯子/点头只需要手臂或头部的细微变化）
- 绝对禁止复制、拼接、并排展示首帧画面，画面中只能有一个视角的一个画面`;
    actionDiffConstraint = `【关键：尾帧必须体现动作完成状态 - 严禁复制首帧】
- 画面中只能出现一个场景、一个视角，绝对不能出现分屏、拼接、左右对比、多视角并排
- 根据动作幅度合理体现首尾帧差异：大动作（奔跑、战斗、跳跃）需要位置和姿势的大幅变化；小动作（拿起物品、转头、挥手）只需局部肢体变化，整体构图可以相近
- 保持同一场景、同一角色，动作状态体现从"起始"到"完成"的变化
- 首帧仅用于参考角色外貌和场景风格，不要在画面中重现首帧的构图`;
  }

  const prevContext = (frameType === 'start' && prevDescription)
    ? `上一个镜头描述：${prevDescription}\n注意：当前画面需要自然衍接上一个镜头的结束状态，保持角色、场景、光线的连续性。`
    : '';

  const extraInfo = [charBlock, sceneBlock, shotInfo, emotionInfo, styleInfo, frameDescBlock, dialogueBlock, prevEndStateBlock, endStateBlock, charConstraint, actionDiffConstraint, prevContext].filter(Boolean).join('\n');

  const promptRequest = `你是一个专业的图片生成提示词专家。你需要为动作镜头的首尾帧分别生成差异明显的提示词。

请根据以下分镜描述，生成一个适合图片生成的详细提示词：

分镜描述：${description}
${extraInfo}
${frameHint}

要求：
1. 【最重要】仔细分析分镜描述中的动作，提取该动作在${frameType === 'start' ? '起始' : '完成'}时刻的具体画面
2. 必须明确描述角色的具体姿势（站/坐/跑/蹲等）、肢体位置、身体朝向
3. 【细节保留】角色的每一个外貌细节都必须原样写入提示词：发色、发型、瞳色、服装款式、服装颜色、配饰等，不得省略或概括。例如"黑色双马尾、红色水手服、蓝色百褶裙"必须逐项写出，不能简化为"a girl in school uniform"
4. 【细节保留】场景的每一个环境细节都必须原样写入提示词：建筑结构、物品摆设、光源方向、色调等，不得省略
5. 镜头类型决定构图（如特写聚焦面部，远景展示全貌）
6. 如果有上一镜头信息，确保画面与上一镜头自然衍接
7. 如果有视觉风格要求，提示词必须体现该风格特征
8. 严格遵守角色约束：有角色时与参考图一致，无角色时绝对不能出现人物
9. 【尾帧专用】如果这是尾帧提示词，必须在提示词开头加上 "single image, single scene, one unified viewpoint," 并在末尾加上 ", NOT split screen, NOT side by side, NOT collage, NOT multiple panels, NOT diptych"
10. 只输出英文提示词，不要其他解释

提示词：`;

  const result = await handleBaseTextModelCall({
    prompt: promptRequest,
    textModel,
    maxTokens: 500,
    temperature: 0.7
  });

  return result.content || description;
}

async function handleFrameGeneration(inputParams, onProgress) {
  const { storyboardId, prompt, imageModel: modelName, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene } = inputParams;

  if (!storyboardId) {
    throw new Error('缺少必要参数: storyboardId');
  }
  if (!modelName) {
    throw new Error('imageModel 参数是必需的');
  }

  console.log('[FrameGen] 开始生成首尾帧，storyboardId:', storyboardId);
  if (onProgress) onProgress(5);

  // 1. 查询分镜数据
  const storyboard = await queryOne(
    'SELECT * FROM storyboards WHERE id = ?',
    [storyboardId]
  );
  if (!storyboard) {
    throw new Error(`分镜 ${storyboardId} 不存在`);
  }

  // 项目视觉风格（必填，未设置则报错）
  const visualStyle = await requireVisualStyle(storyboard.project_id);

  let variables = {};
  try {
    variables = typeof storyboard.variables_json === 'string'
      ? JSON.parse(storyboard.variables_json || '{}')
      : (storyboard.variables_json || {});
  } catch (e) {
    variables = {};
  }

  const description = prompt || storyboard.prompt_template || '';

  // 2. 收集参考图（角色正面图 + 场景图），多角色会抛异常
  if (onProgress) onProgress(10);
  const { imageUrls, characterName, characterInfo, location, sceneInfo } = await collectReferenceImages(storyboard, variables);

  // 2.5 自动查询上一镜头的尾帧（如果调用方没有传入）
  let resolvedPrevEndFrameUrl = prevEndFrameUrl || null;
  let resolvedPrevDescription = prevDescription || null;
  let resolvedPrevEndState = null;
  let resolvedIsFirstScene = isFirstScene;

  // 如果没有显式传入 isFirstScene，自动判断
  if (resolvedIsFirstScene === undefined || resolvedIsFirstScene === null) {
    const scriptId = storyboard.script_id;
    const currentIdx = storyboard.idx;
    if (scriptId != null && currentIdx != null && currentIdx > 0) {
      resolvedIsFirstScene = false;
    } else {
      resolvedIsFirstScene = true;
    }
  }

  // 非首镜头且没有传入前一帧时，自动从数据库查询
  if (!resolvedIsFirstScene && !resolvedPrevEndFrameUrl) {
    const scriptId = storyboard.script_id;
    const currentIdx = storyboard.idx;
    if (scriptId != null && currentIdx != null) {
      const prevSb = await queryOne(
        'SELECT id, prompt_template, variables_json, first_frame_url, last_frame_url FROM storyboards WHERE script_id = ? AND idx = ?',
        [scriptId, currentIdx - 1]
      );
      if (prevSb) {
        let prevVars = {};
        try {
          prevVars = typeof prevSb.variables_json === 'string'
            ? JSON.parse(prevSb.variables_json || '{}')
            : (prevSb.variables_json || {});
        } catch (e) { prevVars = {}; }
        const prevHasAction = prevVars.hasAction || false;
        // 动作镜头取尾帧，静态镜头取首帧
        resolvedPrevEndFrameUrl = (prevHasAction && prevSb.last_frame_url)
          ? prevSb.last_frame_url
          : (prevSb.first_frame_url || null);
        resolvedPrevDescription = prevSb.prompt_template || null;
        resolvedPrevEndState = prevVars.endState || null;
        console.log('[FrameGen] 自动查询到上一镜头尾帧:', resolvedPrevEndFrameUrl);
        if (resolvedPrevEndState) console.log('[FrameGen] 上一镜头 endState:', resolvedPrevEndState);
      }
    }
  }

  // 加入上一镜头尾帧作为参考图（保持镜头间连续性）
  if (!resolvedIsFirstScene) {
    if (resolvedPrevEndFrameUrl) {
      imageUrls.unshift(resolvedPrevEndFrameUrl);
      console.log('[FrameGen] 加入上一镜头尾帧作为参考:', resolvedPrevEndFrameUrl);
    } else {
      throw new Error('非首镜头缺少上一镜头的尾帧参考图（上一镜头未生成帧图片），无法保证镜头连续性。请先确保上一镜头已生成帧图片。');
    }
  }
  console.log('[FrameGen] 参考图数组:', imageUrls);

  // 3. 生成首帧提示词（加入上一镜头描述作为上下文）
  if (onProgress) onProgress(15);
  let startPrompt = description;
  if (textModel) {
    console.log('[FrameGen] 使用文本模型生成首帧提示词...');
    startPrompt = await generateFramePrompt({ textModel, description, frameType: 'start', characterInfo, sceneInfo, shotType: variables.shotType, emotion: variables.emotion, prevDescription: resolvedPrevDescription || null, visualStyle, startFrameDesc: variables.startFrame, endFrameDesc: variables.endFrame, dialogue: variables.dialogue, prevEndState: resolvedPrevEndState, endState: variables.endState });
    console.log('[FrameGen] 首帧提示词:', startPrompt.substring(0, 100) + '...');
  } else {
    const prevHint = resolvedPrevDescription ? `，承接上一镜头「${resolvedPrevDescription}」的结束状态` : '';
    startPrompt = `${description}，画面开始时刻，动作起始状态${prevHint}`;
    console.log('[FrameGen] 无文本模型，使用拼接提示词');
  }

  // 4. 生成首帧
  if (onProgress) onProgress(25);
  console.log('[FrameGen] 开始生成首帧...');
  const startFrame = await generateSingleImage(modelName, startPrompt, width, height, 'FrameGen-Start', imageUrls);

  // 持久化首帧到 MinIO
  const persistedStartFrame = await downloadAndStore(
    startFrame,
    `images/frames/${storyboardId}/first_frame`,
    { fallbackExt: '.png' }
  );

  // 保存首帧到数据库
  await execute(
    'UPDATE storyboards SET first_frame_url = ? WHERE id = ?',
    [persistedStartFrame, storyboardId]
  );
  console.log('[FrameGen] 首帧已保存:', persistedStartFrame);

  // 5. 生成尾帧提示词
  if (onProgress) onProgress(50);
  let endPrompt = description;
  if (textModel) {
    console.log('[FrameGen] 使用文本模型生成尾帧提示词...');
    endPrompt = await generateFramePrompt({ textModel, description, frameType: 'end', characterInfo, sceneInfo, shotType: variables.shotType, emotion: variables.emotion, prevDescription: null, visualStyle, startFrameDesc: variables.startFrame, endFrameDesc: variables.endFrame, dialogue: variables.dialogue, prevEndState: null, endState: variables.endState });
    // 强制追加反拼接关键词（防止图片模型将首帧参考图复制/拼接到尾帧中）
    const antiCollage = 'single image, single scene, one unified viewpoint, NOT split screen, NOT side by side, NOT collage, NOT multiple panels, NOT diptych, NOT before and after';
    if (!endPrompt.includes('NOT split screen')) {
      endPrompt = `single image, single scene, one unified viewpoint, ${endPrompt}, ${antiCollage}`;
    }
    console.log('[FrameGen] 尾帧提示词:', endPrompt.substring(0, 100) + '...');
  } else {
    endPrompt = `${description}，画面结束时刻，动作完成状态，延续前一帧的场景和角色`;
  }

  // 6. 生成尾帧（参考图 = 首帧 + 角色图 + 场景图）
  if (onProgress) onProgress(60);
  console.log('[FrameGen] 开始生成尾帧...');
  // 首帧放最前面（权重最高），再追加原始角色图和场景图保持一致性
  const endFrameRefs = [];
  if (startFrame) endFrameRefs.push(startFrame);
  // imageUrls 中包含 [上一帧尾帧?, 角色正面图?, 侧/背面图?, 场景图]
  // 从中提取角色图和场景图（跳过上一帧尾帧和首帧本身）
  for (const url of imageUrls) {
    if (url !== resolvedPrevEndFrameUrl && url !== startFrame && !endFrameRefs.includes(url)) {
      endFrameRefs.push(url);
    }
  }
  console.log('[FrameGen] 尾帧参考图:', endFrameRefs);
  const endFrame = await generateSingleImage(modelName, endPrompt, width, height, 'FrameGen-End', endFrameRefs);

  // 持久化尾帧到 MinIO
  const persistedEndFrame = await downloadAndStore(
    endFrame,
    `images/frames/${storyboardId}/last_frame`,
    { fallbackExt: '.png' }
  );

  // 保存尾帧到数据库
  await execute(
    'UPDATE storyboards SET last_frame_url = ? WHERE id = ?',
    [persistedEndFrame, storyboardId]
  );
  console.log('[FrameGen] 尾帧已保存:', persistedEndFrame);

  if (onProgress) onProgress(100);
  console.log('[FrameGen] 首尾帧生成完成');

  return {
    startFrame: persistedStartFrame,
    endFrame: persistedEndFrame,
    model: modelName,
    startPrompt,
    endPrompt
  };
}

module.exports = handleFrameGeneration;
