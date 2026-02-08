/**
 * 分镜视频生成处理器
 * 
 * 流程：
 * 1. 查询分镜数据，获取首尾帧 URL 和 variables_json
 * 2. 校验帧完整性：
 *    - 动作镜头（hasAction=true）：必须有首帧 + 尾帧
 *    - 静态镜头（hasAction=false）：必须有首帧
 * 3. 查询前后镜头描述作为上下文，确保视频衔接连贯
 * 4. 获取镜头完整信息（描述、shotType、emotion），调用文本模型生成视频提示词
 * 5. 构建 imageUrls = [首帧, 尾帧(如果有)]，以 imageUrls + 视频提示词调用视频模型生成视频
 * 6. 保存视频 URL 到数据库
 * 
 * input:  { storyboardId, videoModel, textModel, duration }
 * output: { videoUrl, model, promptUsed }
 */

const { submitAndPoll } = require('../pollUtils');
const { execute, queryOne, queryAll } = require('../../../dbHelper');
const handleBaseTextModelCall = require('../base/baseTextModelCall');
const { requireVisualStyle } = require('../../../utils/getProjectStyle');

async function handleSceneVideoGeneration(inputParams, onProgress) {
  const { storyboardId, videoModel, modelName: _legacy, textModel, duration } = inputParams;
  const modelName = videoModel || _legacy;

  if (!storyboardId) {
    throw new Error('缺少必要参数: storyboardId');
  }
  if (!modelName) {
    throw new Error('videoModel 参数是必需的');
  }

  console.log('[SceneVideoGen] 开始生成视频，storyboardId:', storyboardId);
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

  const hasAction = variables.hasAction || false;
  const description = storyboard.prompt_template || '';
  const firstFrameUrl = storyboard.first_frame_url || null;
  const lastFrameUrl = storyboard.last_frame_url || null;

  // 2. 校验帧完整性
  if (hasAction) {
    if (!firstFrameUrl || !lastFrameUrl) {
      throw new Error('动作镜头必须包含首帧和尾帧，请先生成首尾帧');
    }
    console.log('[SceneVideoGen] 动作镜头，首帧:', firstFrameUrl, '尾帧:', lastFrameUrl);
  } else {
    if (!firstFrameUrl) {
      throw new Error('静态镜头必须包含首帧，请先生成帧图片');
    }
    console.log('[SceneVideoGen] 静态镜头，首帧:', firstFrameUrl);
  }

  // 3. 查询前后镜头描述（用于视频提示词上下文）
  if (onProgress) onProgress(10);
  let prevSceneDesc = '';
  let nextSceneDesc = '';
  try {
    const scriptId = storyboard.script_id;
    const currentIdx = storyboard.idx;
    if (scriptId != null && currentIdx != null) {
      const neighbors = await queryAll(
        'SELECT idx, prompt_template FROM storyboards WHERE script_id = ? AND idx IN (?, ?) ORDER BY idx ASC',
        [scriptId, currentIdx - 1, currentIdx + 1]
      );
      for (const nb of neighbors) {
        if (nb.idx === currentIdx - 1) prevSceneDesc = nb.prompt_template || '';
        if (nb.idx === currentIdx + 1) nextSceneDesc = nb.prompt_template || '';
      }
    }
  } catch (e) {
    console.warn('[SceneVideoGen] 查询前后镜头失败，跳过上下文:', e.message);
  }

  // 4. 生成视频提示词
  let promptUsed = description;

  if (textModel) {
    console.log('[SceneVideoGen] 使用文本模型生成视频提示词...');

    const charNames = variables.characters || [];
    const charInfo = charNames.length > 0 ? `角色: ${charNames.join('、')}` : '无特定角色';
    const locInfo = variables.location ? `场景: ${variables.location}` : '无特定场景';
    const shotInfo = variables.shotType ? `镜头类型: ${variables.shotType}` : '';
    const emotionInfo = variables.emotion ? `情绪/氛围: ${variables.emotion}` : '';
    const dialogueInfo = variables.dialogue ? `对话/台词: ${variables.dialogue}` : '';
    const actionInfo = hasAction ? '这是一个有动作的镜头，需要描述动作的完整过程' : '这是一个静态镜头，画面变化较小';
    const styleInfo = visualStyle ? `视觉风格: ${visualStyle}` : '';
    const prevContext = prevSceneDesc ? `上一个镜头：${prevSceneDesc}` : '';
    const nextContext = nextSceneDesc ? `下一个镜头：${nextSceneDesc}` : '';
    const extraInfo = [charInfo, locInfo, shotInfo, emotionInfo, dialogueInfo, actionInfo, styleInfo, prevContext, nextContext].filter(Boolean).join('\n');

    const promptRequest = `你是一个专业的视频生成提示词专家。

请根据以下分镜描述，生成一个适合视频生成的详细提示词：

分镜描述：${description}
${extraInfo}

要求：
1. 提示词要描述画面中的运动、动作变化和镜头运动
2. 包含场景氛围、光线变化
3. 镜头类型决定视角和运镜方式
4. 如果有前后镜头信息，确保视频开头自然衍接上一镜头，结尾为下一镜头做好过渡
5. 如果有视觉风格要求，视频必须体现该风格特征
6. 只输出提示词本身，不要其他解释

提示词：`;

    const result = await handleBaseTextModelCall({
      prompt: promptRequest,
      textModel,
      maxTokens: 500,
      temperature: 0.7
    });

    promptUsed = result.content || description;
    console.log('[SceneVideoGen] 视频提示词:', promptUsed.substring(0, 100) + '...');
  } else {
    console.log('[SceneVideoGen] 无文本模型，使用原始描述作为视频提示词');
  }

  // 5. 构建 imageUrls 并生成视频
  if (onProgress) onProgress(20);
  const imageUrls = [firstFrameUrl];
  if (hasAction && lastFrameUrl) {
    imageUrls.push(lastFrameUrl);
  }
  console.log('[SceneVideoGen] imageUrls:', imageUrls);

  const submitParams = {
    prompt: promptUsed,
    duration: duration || (hasAction ? 3 : 2),
    imageUrls
  };

  const result = await submitAndPoll(modelName, submitParams, {
    intervalMs: 5000,
    maxDurationMs: 3600000,
    logTag: 'SceneVideoGen'
  });

  if (onProgress) onProgress(90);

  const videoUrl = result.video_url || result.videoUrl || result.url || null;
  if (!videoUrl) {
    throw new Error('视频生成成功但未找到视频 URL');
  }

  // 5. 保存视频 URL 到数据库
  await execute(
    'UPDATE storyboards SET video_url = ? WHERE id = ?',
    [videoUrl, storyboardId]
  );
  console.log('[SceneVideoGen] 视频已保存:', videoUrl);

  if (onProgress) onProgress(100);
  console.log('[SceneVideoGen] 视频生成完成');

  return {
    videoUrl,
    model: modelName,
    promptUsed
  };
}

module.exports = handleSceneVideoGeneration;
