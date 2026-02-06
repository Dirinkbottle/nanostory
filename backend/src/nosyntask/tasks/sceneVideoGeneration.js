/**
 * 分镜视频生成处理器（图生视频）
 * 使用公共轮询组件 submitAndPoll 处理同步/异步模型
 * 
 * 支持两种模式：
 *   - 有动作：用首帧+尾帧描述生成
 *   - 无动作：用单图+描述生成
 * 
 * input:  { prompt, imageUrl, startFrame, endFrame, modelName, duration }
 * output: { videoUrl, model }
 */

const { submitAndPoll } = require('./pollUtils');

async function handleSceneVideoGeneration(inputParams, onProgress) {
  const { prompt, imageUrl, startFrame, endFrame, modelName, duration } = inputParams;

  if (!prompt) {
    throw new Error('缺少画面描述 prompt');
  }

  const targetModel = modelName || 'sora2-new';

  // 构建视频生成提示词
  let videoPrompt = prompt;
  if (startFrame && endFrame) {
    videoPrompt = `动画视频：从"${startFrame}"过渡到"${endFrame}"。${prompt}`;
  }

  if (onProgress) onProgress(10);

  // submitAndPoll 失败会直接 throw
  const result = await submitAndPoll(targetModel, {
    prompt: videoPrompt,
    image_url: imageUrl,
    duration: String(Math.min(duration || 5, 10)),
    size: 'small',
    aspectRatio: '16:9'
  }, {
    intervalMs: 5000,
    maxDurationMs: 600000,
    onProgress,
    progressStart: 20,
    progressEnd: 90,
    logTag: 'SceneVideoGen'
  });

  if (onProgress) onProgress(100);

  return {
    videoUrl: result.video_url || result.videoUrl || result.url || null,
    model: targetModel
  };
}

module.exports = handleSceneVideoGeneration;
