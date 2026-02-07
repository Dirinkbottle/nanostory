/**
 * 图片生成处理器（角色/场景通用）
 * 使用公共轮询组件 submitAndPoll 处理同步/异步模型
 * 
 * input:  { prompt, imageModel, width, height, imageUrl?, imageUrls? }
 * output: { image_url, taskId?, tokens?, provider }
 */

const { submitAndPoll } = require('../pollUtils');

async function handleImageGeneration(inputParams, onProgress) {
  const { prompt, imageModel: _imageModel, modelName: _legacyModelName, width, height, imageUrl, imageUrls } = inputParams;
  const modelName = _imageModel || _legacyModelName;

  if (!modelName) {
    throw new Error('imageModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  // 构建提交参数
  const submitParams = {
    prompt,
    width: width || 1024,
    height: height || 1024
  };

  // 统一协议：imageUrl(单张string) 和 imageUrls(数组string[])
  // 模板中用 {{imageUrl}} 和 {{imageUrls}} 分别匹配
  if (imageUrl) {
    submitParams.imageUrl = imageUrl;
  }
  if (imageUrls) {
    submitParams.imageUrls = imageUrls;
  }

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
