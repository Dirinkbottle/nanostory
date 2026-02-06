/**
 * 图片生成处理器（角色/场景通用）
 * 使用公共轮询组件 submitAndPoll 处理同步/异步模型
 * 
 * input:  { prompt, modelName, width, height }
 * output: { image_url, taskId?, tokens?, provider }
 */

const { submitAndPoll } = require('../pollUtils');

async function handleImageGeneration(inputParams, onProgress) {
  const { prompt, modelName, width, height } = inputParams;
  const selectedModel = modelName || 'Default Image Model';

  if (onProgress) onProgress(10);

  // submitAndPoll 失败会直接 throw，成功返回 { status: true, ...映射结果, _submitResult }
  const result = await submitAndPoll(selectedModel, {
    prompt,
    width: width || 1024,
    height: height || 1024
  }, {
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
