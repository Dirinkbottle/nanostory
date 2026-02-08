/**
 * 视频生成处理器（占位）
 * input:  { prompt, imageUrl, videoModel, duration }
 * output: { videoUrl, model }
 */

const { submitAndPoll } = require('./pollUtils');

async function handleVideoGeneration(inputParams, onProgress) {
  const { prompt, imageUrl, videoModel, modelName: _legacy, duration } = inputParams;
  const modelName = videoModel || _legacy;

  if (!modelName) {
    throw new Error('videoModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  const result = await submitAndPoll(modelName, {
    prompt,
    image_url: imageUrl,
    duration: duration || 5
  }, {
    intervalMs: 5000,
    maxDurationMs: 3600000,
    logTag: 'VideoGen'
  });

  if (onProgress) onProgress(100);

  const videoUrl = result.video_url || result.videoUrl || result.url || null;
  if (!videoUrl) {
    throw new Error('视频生成成功但未找到视频 URL');
  }

  return {
    videoUrl,
    model: modelName
  };
}

module.exports = handleVideoGeneration;
