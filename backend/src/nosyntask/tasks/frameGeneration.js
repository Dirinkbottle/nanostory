/**
 * 分镜首尾帧生成处理器
 * 生成两张图片：首帧（动作起始）和尾帧（动作结束）
 * 使用公共轮询组件 submitAndPoll 处理同步/异步模型
 * 
 * input:  { prompt, modelName, width, height }
 * output: { startFrame, endFrame, model }
 */

const { submitAndPoll } = require('./pollUtils');
const { getImageModels } = require('../../aiModelService');

/**
 * 生成单张图片（通过 submitAndPoll 自动处理同步/异步）
 */
async function generateSingleImage(modelName, prompt, width, height, logTag) {
  // submitAndPoll 失败会直接 throw
  const result = await submitAndPoll(modelName, {
    prompt,
    width: width || 1024,
    height: height || 576,
    imageSize: `${width || 1024}x${height || 576}`,
    aspectRatio: '16:9'
  }, {
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

async function handleFrameGeneration(inputParams, onProgress) {
  const { prompt, modelName, width, height } = inputParams;

  // 获取模型
  let targetModel = modelName;
  if (!targetModel) {
    const models = await getImageModels();
    if (models.length === 0) {
      const w = width || 1024;
      const h = height || 576;
      const encodedPrompt = encodeURIComponent((prompt || '').substring(0, 20));
      return {
        startFrame: `https://placehold.co/${w}x${h}/3b82f6/ffffff?text=Start:${encodedPrompt}`,
        endFrame: `https://placehold.co/${w}x${h}/6366f1/ffffff?text=End:${encodedPrompt}`,
        model: 'placeholder'
      };
    }
    targetModel = models[0].name;
  }

  if (onProgress) onProgress(10);

  // 生成首帧
  console.log('[FrameGen] 开始生成首帧...');
  const startFramePrompt = `${prompt}，画面开始时刻，动作起始状态`;
  const startFrame = await generateSingleImage(targetModel, startFramePrompt, width, height, 'FrameGen-Start');

  if (onProgress) onProgress(50);

  // 生成尾帧
  console.log('[FrameGen] 首帧完成，开始生成尾帧...');
  const endFramePrompt = `${prompt}，画面结束时刻，动作完成状态，延续前一帧的场景和角色`;
  const endFrame = await generateSingleImage(targetModel, endFramePrompt, width, height, 'FrameGen-End');

  if (onProgress) onProgress(100);
  console.log('[FrameGen] 尾帧完成');

  return {
    startFrame,
    endFrame,
    model: targetModel
  };
}

module.exports = handleFrameGeneration;
