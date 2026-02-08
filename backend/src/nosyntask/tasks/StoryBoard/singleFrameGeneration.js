/**
 * 分镜单帧生成处理器（无动作镜头，仅生成首帧）
 * 
 * 流程：
 * 1. 查询分镜数据，获取角色列表和场景名称
 * 2. 查询角色正面图 URL + 场景图 URL，拼接为 imageUrls 参考数组
 *    （多角色镜头阻止）
 * 3. 如果有上一镜头尾帧（prevEndFrameUrl），加入参考图列表以保持连续性
 * 4. 调用文本模型，根据镜头描述 + 上一镜头上下文生成帧提示词
 * 5. 以 imageUrls + 提示词 调用图片模型生成单帧，保存到数据库
 * 
 * input:  { storyboardId, description, imageModel, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene }
 * output: { firstFrameUrl, promptUsed, model }
 */

const { execute, queryOne } = require('../../../dbHelper');
const baseTextModelCall = require('../base/baseTextModelCall');
const imageGeneration = require('../base/imageGeneration');
const { requireVisualStyle } = require('../../../utils/getProjectStyle');

/**
 * 从分镜数据中收集参考图 URL 数组（角色正面图 + 场景图）
 */
async function collectReferenceImages(storyboard, variables) {
  const projectId = storyboard.project_id;
  const characterNames = variables.characters || [];
  const location = variables.location || '';
  const imageUrls = [];

  // 校验：多角色镜头阻止
  if (characterNames.length > 1) {
    throw new Error(`当前仅支持单角色镜头，该镜头包含 ${characterNames.length} 个角色: ${characterNames.join('、')}。请拆分镜头或手动处理。`);
  }

  let characterName = null;
  if (characterNames.length === 1) {
    characterName = characterNames[0];
    const character = await queryOne(
      'SELECT image_url FROM characters WHERE project_id = ? AND name = ?',
      [projectId, characterName]
    );
    if (character && character.image_url) {
      imageUrls.push(character.image_url);
      console.log(`[SingleFrameGen] 角色「${characterName}」正面图:`, character.image_url);
    } else {
      console.warn(`[SingleFrameGen] 角色「${characterName}」没有正面图，跳过`);
    }
  }

  // 查询场景图
  if (location) {
    const scene = await queryOne(
      'SELECT image_url FROM scenes WHERE project_id = ? AND name = ?',
      [projectId, location]
    );
    if (scene && scene.image_url) {
      imageUrls.push(scene.image_url);
      console.log(`[SingleFrameGen] 场景「${location}」图片:`, scene.image_url);
    } else {
      console.warn(`[SingleFrameGen] 场景「${location}」没有图片，跳过`);
    }
  }

  return { imageUrls, characterName, location };
}

async function handleSingleFrameGeneration(inputParams, onProgress) {
  const { storyboardId, description, imageModel, modelName: _legacy, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene } = inputParams;
  const modelName = imageModel || _legacy;

  if (!storyboardId) {
    throw new Error('缺少必要参数: storyboardId');
  }

  if (!modelName) {
    throw new Error('imageModel 参数是必需的');
  }

  console.log('[SingleFrameGen] 开始生成单帧，storyboardId:', storyboardId);
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

  const desc = description || storyboard.prompt_template || '';

  // 2. 收集参考图（角色正面图 + 场景图）
  if (onProgress) onProgress(10);
  const { imageUrls, characterName, location } = await collectReferenceImages(storyboard, variables);

  // 2.5 加入上一镜头尾帧作为参考图（保持镜头间连续性）
  if (!isFirstScene) {
    if (prevEndFrameUrl) {
      imageUrls.unshift(prevEndFrameUrl);
      console.log('[SingleFrameGen] 加入上一镜头尾帧作为参考:', prevEndFrameUrl);
    } else {
      throw new Error('非首镜头缺少上一镜头的尾帧参考图，这会导致镜头间严重割裂。请先确保上一镜头已生成帧图片。');
    }
  }
  console.log('[SingleFrameGen] 参考图数组:', imageUrls);

  // 3. 生成帧提示词
  if (onProgress) onProgress(20);
  let promptUsed = desc;

  if (textModel) {
    console.log('[SingleFrameGen] 使用文本模型生成帧提示词...');
    const charInfo = characterName ? `主要角色: ${characterName}` : '无特定角色';
    const locInfo = location ? `场景: ${location}` : '无特定场景';
    const shotInfo = variables.shotType ? `镜头类型: ${variables.shotType}` : '';
    const emotionInfo = variables.emotion ? `情绪/氛围: ${variables.emotion}` : '';
    const styleInfo = visualStyle ? `视觉风格: ${visualStyle}` : '';
    const prevContext = prevDescription
      ? `上一个镜头描述：${prevDescription}\n注意：当前画面需要自然衔接上一个镜头的结束状态，保持角色、场景、光线的连续性。`
      : '';
    const extraInfo = [charInfo, locInfo, shotInfo, emotionInfo, styleInfo, prevContext].filter(Boolean).join('\n');

    const promptGenerationResult = await baseTextModelCall({
      prompt: `你是一个专业的图片生成提示词专家。

请根据以下分镜描述，生成一个适合图片生成的详细提示词：

分镜描述：${desc}
${extraInfo}

要求：
1. 提示词要详细描述画面内容、构图、光线、氛围
2. 包含角色的动作状态和表情
3. 镜头类型决定构图（如特写聚焦面部，远景展示全貌）
4. 如果有上一镜头信息，确保画面与上一镜头自然衔接
5. 如果有视觉风格要求，提示词必须体现该风格特征
6. 只输出提示词本身，不要其他解释

提示词：`,
      textModel,
      maxTokens: 500,
      temperature: 0.7
    });

    promptUsed = promptGenerationResult.content || desc;
    console.log('[SingleFrameGen] 生成的提示词:', promptUsed.substring(0, 100) + '...');
  } else {
    const prevHint = prevDescription ? `，承接上一镜头「${prevDescription}」的结束状态` : '';
    promptUsed = `${desc}${prevHint}`;
    console.log('[SingleFrameGen] 无文本模型，使用拼接提示词');
  }

  // 4. 生成首帧图片
  if (onProgress) onProgress(50);
  console.log('[SingleFrameGen] 生成首帧图片...');

  const imageResult = await imageGeneration({
    prompt: promptUsed,
    imageModel: modelName,
    width: width || 1024,
    height: height || 576,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined
  });

  const firstFrameUrl = imageResult.image_url;
  console.log('[SingleFrameGen] 首帧生成完成:', firstFrameUrl);

  // 保存到数据库
  if (onProgress) onProgress(90);
  console.log('[SingleFrameGen] 保存首帧到数据库...');

  await execute(
    'UPDATE storyboards SET first_frame_url = ? WHERE id = ?',
    [firstFrameUrl, storyboardId]
  );

  if (onProgress) onProgress(100);
  console.log('[SingleFrameGen] 单帧生成完成');

  return {
    firstFrameUrl,
    promptUsed,
    model: imageResult.model || modelName
  };
}

module.exports = handleSingleFrameGeneration;
