/**
 * 图片生成处理器（角色/场景通用）
 * 使用公共轮询组件 submitAndPoll 处理同步/异步模型
 * 
 * input:  { prompt, imageModel, width, height, imageUrl?, imageUrls? }
 * output: { image_url, taskId?, tokens?, provider }
 */

const { submitAndPoll } = require('../pollUtils');
const { deriveImageParams } = require('../../../utils/deriveImageParams');

async function handleImageGeneration(inputParams, onProgress) {
  const { prompt, imageModel: modelName, width, height, imageUrl, imageUrls, startFrame, endFrame } = inputParams;

  if (!modelName) {
    throw new Error('imageModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  // 自动派生图片相关参数
  const derived = deriveImageParams({ imageUrl, imageUrls, startFrame, endFrame });

  // 构建提交参数
  const submitParams = {
    prompt,
    width: width || 1024,
    height: height || 1024
  };

  if (derived.imageUrl)   submitParams.imageUrl = derived.imageUrl;
  if (derived.imageUrls)  submitParams.imageUrls = derived.imageUrls;
  if (derived.startFrame) submitParams.startFrame = derived.startFrame;
  if (derived.endFrame)   submitParams.endFrame = derived.endFrame;

  const result = await submitAndPoll(modelName, submitParams, {
    intervalMs: 3000,
    maxDurationMs: 300000,
    onProgress,
    progressStart: 30,
    progressEnd: 90,
    logTag: 'ImageGen'
  });

  if (onProgress) onProgress(100);

  return {
    image_url: result.image_url || result.url || result.imageUrl || null,
    taskId: result._submitResult?.taskId || null,
    tokens: result._submitResult?.tokens || 0,
    provider: result._submitResult?._model?.provider || 'unknown'
  };
}

module.exports = handleImageGeneration;
