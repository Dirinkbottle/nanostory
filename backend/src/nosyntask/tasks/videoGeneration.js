/**
 * 视频生成处理器
 * 使用公共轮询组件 submitAndPoll 处理同步/异步模型
 * 
 * input:  { prompt, image_url, modelName, duration }
 * output: { video_url, taskId?, tokens?, provider }
 */

const { submitAndPoll } = require('./pollUtils');

async function handleVideoGeneration(inputParams, onProgress) {
  const { prompt, image_url, modelName, duration } = inputParams;
  const selectedModel = modelName || 'Default Video Model';

  if (onProgress) onProgress(10);

  const result = await submitAndPoll(selectedModel, {
    prompt,
    image_url,
    duration: duration || 5
  }, {
    intervalMs: 5000,
    maxDurationMs: 600000,
    onProgress,
    progressStart: 30,
    progressEnd: 90,
    logTag: 'VideoGen'
  });

  if (onProgress) onProgress(100);

  return {
    video_url: result.video_url || result.videoUrl || result.url || null,
    taskId: result._submitResult?.taskId || null,
    tokens: result._submitResult?.tokens || 0,
    provider: result._submitResult?._model?.provider || 'unknown'
  };
}

module.exports = handleVideoGeneration;
