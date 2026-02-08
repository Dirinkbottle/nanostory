/**
 * 基础视频模型调用任务
 * 使用公共轮询组件 submitAndPoll 处理同步/异步视频生成模型
 * 
 * 输入参数:
 * @param {string} params.prompt - 视频描述提示词
 * @param {string} params.videoModel - 视频生成模型名称（统一字段名）
 * @param {number} params.duration - 视频时长（秒，默认 5）
 * @param {string} params.imageUrl - 单张参考图片 URL（图生视频，可选）。模板占位符: {{imageUrl}}
 * @param {string[]} params.imageUrls - 参考图片 URL 数组（可选）。模板占位符: {{imageUrls}}
 * @param {string} params.aspectRatio - 画面比例（如 "16:9"、"9:16"、"1:1"，可选）。模板占位符: {{aspectRatio}}
 * 
 * 输出:
 * @returns {Object} { video_url, taskId, tokens, provider }
 */

const { submitAndPoll } = require('../pollUtils');

async function handleBaseVideoModelCall(inputParams, onProgress) {
  const {
    prompt,
    videoModel: _videoModel,
    modelName: _legacyModelName,
    duration = 5,
    imageUrl,
    imageUrls,
    aspectRatio
  } = inputParams;

  const modelName = _videoModel || _legacyModelName;

  if (!modelName) {
    throw new Error('videoModel 参数是必需的');
  }

  console.log('[BaseVideoModelCall] 开始调用视频模型:', {
    modelName,
    promptLength: prompt?.length || 0,
    duration,
    hasImage: !!imageUrl,
    aspectRatio: aspectRatio || '未指定'
  });

  if (onProgress) onProgress(10);

  // 构建提交参数，匹配视频生成 API 接口格式
  const submitParams = {
    prompt: prompt || '',
    duration,
  };

  // 统一协议：imageUrl(单张string) 和 imageUrls(数组string[])
  // 模板中用 {{imageUrl}} 和 {{imageUrls}} 分别匹配
  if (imageUrl) {
    submitParams.imageUrl = imageUrl;
  }
  if (imageUrls) {
    submitParams.imageUrls = imageUrls;
  }
  if (aspectRatio) {
    submitParams.aspectRatio = aspectRatio;
  }

  // 视频生成通常耗时较长，轮询间隔和超时都比图片大
  const result = await submitAndPoll(modelName, submitParams, {
    intervalMs: 5000,
    maxDurationMs: 3600000,   // 10 分钟超时
    onProgress,
    progressStart: 20,
    progressEnd: 90,
    logTag: 'BaseVideoModelCall'
  });

  if (onProgress) onProgress(100);

  const videoUrl = result.video_url || result.videoUrl || result.url || null;

  if (!videoUrl) {
    console.warn('[BaseVideoModelCall] 视频生成成功但未找到视频 URL，返回原始结果');
  }

  return {
    video_url: videoUrl,
    taskId: result._submitResult?.taskId || null,
    tokens: result._submitResult?.tokens || 0,
    provider: result._submitResult?._model?.provider || 'unknown'
  };
}

module.exports = handleBaseVideoModelCall;
