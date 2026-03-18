/**
 * 视频生成处理器（占位）
 * input:  { prompt, imageUrl, videoModel, duration }
 * output: { videoUrl, model }
 */

const { submitAndPoll } = require('./pollUtils');
const { resolveMediaUrl } = require('./base/mediaResultResolver');

async function handleVideoGeneration(inputParams, onProgress) {
  const { prompt, imageUrl, videoModel: modelName, duration } = inputParams;

  if (!modelName) {
    throw new Error('videoModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  const submitParams = {
    prompt,
    image_url: imageUrl
  };

  if (duration !== undefined && duration !== null) {
    submitParams.duration = duration;
  }

  const result = await submitAndPoll(modelName, submitParams, {
    intervalMs: 5000,
    maxDurationMs: 3600000,
    logTag: 'VideoGen'
  });

  const resolution = resolveMediaUrl(result, 'video');
  console.log('[VideoGen] 返回字段诊断:', {
    modelName,
    mappedKeys: result && typeof result === 'object' ? Object.keys(result) : [],
    queryKeys: result?._queryResult && typeof result._queryResult === 'object' ? Object.keys(result._queryResult) : [],
    rawQueryKeys: result?._rawQueryResult && typeof result._rawQueryResult === 'object' ? Object.keys(result._rawQueryResult) : [],
    submitKeys: result?._submitResult && typeof result._submitResult === 'object' ? Object.keys(result._submitResult) : [],
    selectedUrl: resolution.mediaUrl,
    resolvedFrom: resolution.resolvedFrom,
    urlCandidates: resolution.candidates,
    duration: duration ?? null
  });

  if (!resolution.mediaUrl) {
    throw new Error(`视频模型 "${modelName}" 返回成功但未找到视频 URL，请检查 response_mapping / query_success_mapping 配置`);
  }

  if (onProgress) onProgress(100);

  return {
    videoUrl: resolution.mediaUrl,
    model: modelName
  };
}

module.exports = handleVideoGeneration;
