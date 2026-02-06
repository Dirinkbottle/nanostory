/**
 * 视频生成处理器
 * 支持同步和异步两种模型：
 *   - 同步模型：callAIModel 直接返回 video_url
 *   - 异步模型：callAIModel 返回 taskId，然后 queryAIModel 轮询直到完成
 * 
 * input:  { prompt, image_url, modelName, duration }
 * output: { video_url, taskId?, tokens?, provider }
 * 
 * 约定：模型的 query_response_mapping 应映射出 status 和 video_url 字段
 */

const { callAIModel, queryAIModel } = require('../../aiModelService');

// 轮询配置（视频生成通常比图片慢，给更长时间）
const POLL_CONFIG = {
  intervalMs: 5000,        // 轮询间隔 5 秒
  maxDurationMs: 600000,   // 最大等待 10 分钟
  maxNetworkErrors: 5,     // 连续网络错误上限
  successStatuses: ['succeed', 'succeeded', 'completed', 'success', 'done', 'finished'],
  failStatuses: ['failed', 'error', 'cancelled', 'canceled', 'timeout', 'expired'],
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 判断轮询状态
 * @returns {'success' | 'failed' | 'pending'}
 */
function resolveStatus(queryResult) {
  const raw = queryResult._raw || queryResult;
  const status = queryResult.status 
    || raw.status 
    || raw.data?.task_status 
    || raw.data?.status 
    || raw.task_status
    || '';
  
  const s = String(status).toLowerCase();
  
  if (POLL_CONFIG.successStatuses.includes(s)) return 'success';
  if (POLL_CONFIG.failStatuses.includes(s)) return 'failed';
  return 'pending';
}

/**
 * 从查询结果中提取视频 URL
 */
function extractVideoUrl(queryResult) {
  const raw = queryResult._raw || queryResult;
  return queryResult.video_url
    || queryResult.url
    || raw.data?.task_result?.videos?.[0]?.url
    || raw.data?.result?.video_url
    || raw.data?.video_url
    || raw.output?.video_url
    || null;
}

async function handleVideoGeneration(inputParams, onProgress) {
  const { prompt, image_url, modelName, duration } = inputParams;
  const selectedModel = modelName || 'Default Video Model';

  // === 第一步：提交生成请求 ===
  if (onProgress) onProgress(10);

  const submitResult = await callAIModel(selectedModel, {
    prompt,
    image_url,
    duration: duration || 5
  });

  if (onProgress) onProgress(30);

  // 同步模型：直接返回了视频
  const directUrl = submitResult.video_url || submitResult.url;
  if (directUrl && !submitResult.taskId) {
    if (onProgress) onProgress(100);
    return {
      video_url: directUrl,
      tokens: submitResult.tokens || 0,
      provider: submitResult._model?.provider || 'unknown'
    };
  }

  // 异步模型：需要轮询
  if (!submitResult.taskId) {
    throw new Error('模型既未返回视频 URL 也未返回 taskId，无法继续');
  }

  // === 第二步：轮询查询 ===
  const { _raw, _model, ...queryFields } = submitResult;
  
  const startTime = Date.now();
  let networkErrors = 0;
  let pollCount = 0;

  console.log(`[VideoGen] 异步任务已提交, taskId=${submitResult.taskId}, 开始轮询...`);

  while (true) {
    await sleep(POLL_CONFIG.intervalMs);
    pollCount++;

    const elapsed = Date.now() - startTime;
    
    // 超时检查
    if (elapsed > POLL_CONFIG.maxDurationMs) {
      throw new Error(`轮询超时：已等待 ${Math.round(elapsed / 1000)} 秒，任务仍未完成 (taskId: ${submitResult.taskId})`);
    }

    // 更新进度：30% ~ 90% 之间按时间比例递增
    if (onProgress) {
      const progressRatio = Math.min(elapsed / POLL_CONFIG.maxDurationMs, 1);
      const progress = Math.round(30 + progressRatio * 60);
      onProgress(Math.min(progress, 90));
    }

    let queryResult;
    try {
      queryResult = await queryAIModel(selectedModel, queryFields);
      networkErrors = 0;
    } catch (err) {
      networkErrors++;
      console.warn(`[VideoGen] 第 ${pollCount} 次查询网络错误 (${networkErrors}/${POLL_CONFIG.maxNetworkErrors}):`, err.message);
      
      if (networkErrors >= POLL_CONFIG.maxNetworkErrors) {
        throw new Error(`轮询失败：连续 ${networkErrors} 次网络错误，最后一次: ${err.message}`);
      }
      continue;
    }

    const status = resolveStatus(queryResult);
    console.log(`[VideoGen] 第 ${pollCount} 次查询, status=${status}, elapsed=${Math.round(elapsed / 1000)}s`);

    if (status === 'success') {
      const videoUrl = extractVideoUrl(queryResult);
      if (!videoUrl) {
        console.warn('[VideoGen] 任务成功但未找到视频 URL，原始数据:', JSON.stringify(queryResult._raw || queryResult));
      }
      if (onProgress) onProgress(100);
      return {
        video_url: videoUrl,
        taskId: submitResult.taskId,
        tokens: submitResult.tokens || queryResult.tokens || 0,
        provider: submitResult._model?.provider || 'unknown'
      };
    }

    if (status === 'failed') {
      const errorMsg = queryResult.error || queryResult.message 
        || queryResult._raw?.message || queryResult._raw?.data?.message
        || '未知错误';
      throw new Error(`视频生成失败: ${errorMsg} (taskId: ${submitResult.taskId})`);
    }

    // status === 'pending'，继续轮询
  }
}

module.exports = handleVideoGeneration;
