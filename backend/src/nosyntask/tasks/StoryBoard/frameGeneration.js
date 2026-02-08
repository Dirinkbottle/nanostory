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
  const projectId = storyboard.project_id;
  const characterNames = variables.characters || [];
  const location = variables.location || '';
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

  // 查询角色正面图
  let characterName = null;

  // 角色允许为空：
  // - 未指定角色：继续（只用场景参考图）
  // - 指定 1 个角色：要求角色字段完整
  if (characterNames.length === 1) {
    characterName = characterNames[0];
    assertNonEmptyString(characterName, 'name', '角色');
    const character = await queryOne(
      'SELECT name, description, appearance, personality, image_url FROM characters WHERE project_id = ? AND name = ?',
      [projectId, characterName]
    );
    if (!character) {
      throw new Error(`角色不存在: ${characterName}`);
    }
    assertNonEmptyString(character.name, 'name', '角色');
    assertNonEmptyString(character.description, 'description', '角色');
    assertNonEmptyString(character.appearance, 'appearance', '角色');
    assertNonEmptyString(character.personality, 'personality', '角色');
    assertNonEmptyString(character.image_url, 'image_url', '角色');
    imageUrls.push(character.image_url);
    console.log(`[FrameGen] 角色「${characterName}」正面图:`, character.image_url);
  }

  // 查询场景图
  assertNonEmptyString(location, 'name', '场景');
  const scene = await queryOne(
    'SELECT name, description, environment, lighting, mood, image_url FROM scenes WHERE project_id = ? AND name = ?',
    [projectId, location]
  );
  if (!scene) {
    throw new Error(`场景不存在: ${location}`);
  }
  assertNonEmptyString(scene.name, 'name', '场景');
  assertNonEmptyString(scene.description, 'description', '场景');
  assertNonEmptyString(scene.environment, 'environment', '场景');
  assertNonEmptyString(scene.lighting, 'lighting', '场景');
  assertNonEmptyString(scene.mood, 'mood', '场景');
  assertNonEmptyString(scene.image_url, 'image_url', '场景');
  imageUrls.push(scene.image_url);
  console.log(`[FrameGen] 场景「${location}」图片:`, scene.image_url);

  return { imageUrls, characterName, location };
}

/**
 * 调用文本模型生成帧提示词
 */
async function generateFramePrompt(textModel, description, frameType, characterName, location, shotType, emotion, prevDescription, visualStyle) {
  const charInfo = characterName ? `主要角色: ${characterName}` : '无特定角色';
  const locInfo = location ? `场景: ${location}` : '无特定场景';
  const shotInfo = shotType ? `镜头类型: ${shotType}` : '';
  const emotionInfo = emotion ? `情绪/氛围: ${emotion}` : '';
  const styleInfo = visualStyle ? `视觉风格: ${visualStyle}` : '';
  const frameHint = frameType === 'start'
    ? '这是动作的起始画面，角色处于动作开始前的状态'
    : '这是动作的结束画面，角色完成了动作，延续前一帧的场景和角色';

  // 上一镜头上下文（仅首帧需要，用于保持镜头间连续性）
  const prevContext = (frameType === 'start' && prevDescription)
    ? `上一个镜头描述：${prevDescription}\n注意：当前画面需要自然衍接上一个镜头的结束状态，保持角色、场景、光线的连续性。`
    : '';

  const extraInfo = [charInfo, locInfo, shotInfo, emotionInfo, styleInfo, prevContext].filter(Boolean).join('\n');

  const promptRequest = `你是一个专业的图片生成提示词专家。

请根据以下分镜描述，生成一个适合图片生成的详细提示词：

分镜描述：${description}
${extraInfo}
帧类型：${frameHint}

要求：
1. 提示词要详细描述画面内容、构图、光线、氛围
2. 包含角色的动作状态和表情
3. 镜头类型决定构图（如特写聚焦面部，远景展示全貌）
4. 如果有上一镜头信息，确保画面与上一镜头自然衍接
5. 如果有视觉风格要求，提示词必须体现该风格特征
6. 只输出提示词本身，不要其他解释

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
  const { storyboardId, prompt, imageModel, modelName: _legacy, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene } = inputParams;
  const modelName = imageModel || _legacy;

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
  const { imageUrls, characterName, location } = await collectReferenceImages(storyboard, variables);

  // 2.5 加入上一镜头尾帧作为参考图（保持镜头间连续性）
  if (!isFirstScene) {
    if (prevEndFrameUrl) {
      imageUrls.unshift(prevEndFrameUrl); // 放在最前面，权重最高
      console.log('[FrameGen] 加入上一镜头尾帧作为参考:', prevEndFrameUrl);
    } else {
      throw new Error('非首镜头缺少上一镜头的尾帧参考图，这会导致镜头间严重割裂。请先确保上一镜头已生成帧图片。');
    }
  }
  console.log('[FrameGen] 参考图数组:', imageUrls);

  // 3. 生成首帧提示词（加入上一镜头描述作为上下文）
  if (onProgress) onProgress(15);
  let startPrompt = description;
  if (textModel) {
    console.log('[FrameGen] 使用文本模型生成首帧提示词...');
    startPrompt = await generateFramePrompt(textModel, description, 'start', characterName, location, variables.shotType, variables.emotion, prevDescription || null, visualStyle);
    console.log('[FrameGen] 首帧提示词:', startPrompt.substring(0, 100) + '...');
  } else {
    const prevHint = prevDescription ? `，承接上一镜头「${prevDescription}」的结束状态` : '';
    startPrompt = `${description}，画面开始时刻，动作起始状态${prevHint}`;
    console.log('[FrameGen] 无文本模型，使用拼接提示词');
  }

  // 4. 生成首帧
  if (onProgress) onProgress(25);
  console.log('[FrameGen] 开始生成首帧...');
  const startFrame = await generateSingleImage(modelName, startPrompt, width, height, 'FrameGen-Start', imageUrls);

  // 保存首帧到数据库
  await execute(
    'UPDATE storyboards SET first_frame_url = ? WHERE id = ?',
    [startFrame, storyboardId]
  );
  console.log('[FrameGen] 首帧已保存:', startFrame);

  // 5. 生成尾帧提示词
  if (onProgress) onProgress(50);
  let endPrompt = description;
  if (textModel) {
    console.log('[FrameGen] 使用文本模型生成尾帧提示词...');
    endPrompt = await generateFramePrompt(textModel, description, 'end', characterName, location, variables.shotType, variables.emotion, null, visualStyle);
    console.log('[FrameGen] 尾帧提示词:', endPrompt.substring(0, 100) + '...');
  } else {
    endPrompt = `${description}，画面结束时刻，动作完成状态，延续前一帧的场景和角色`;
  }

  // 6. 生成尾帧（参考图 = 首帧）
  if (onProgress) onProgress(60);
  console.log('[FrameGen] 开始生成尾帧（首帧作为参考图）...');
  const endFrameRefs = startFrame ? [startFrame] : [];
  const endFrame = await generateSingleImage(modelName, endPrompt, width, height, 'FrameGen-End', endFrameRefs);

  // 保存尾帧到数据库
  await execute(
    'UPDATE storyboards SET last_frame_url = ? WHERE id = ?',
    [endFrame, storyboardId]
  );
  console.log('[FrameGen] 尾帧已保存:', endFrame);

  if (onProgress) onProgress(100);
  console.log('[FrameGen] 首尾帧生成完成');

  return {
    startFrame,
    endFrame,
    model: modelName,
    startPrompt,
    endPrompt
  };
}

module.exports = handleFrameGeneration;
