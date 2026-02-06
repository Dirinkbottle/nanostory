/**
 * 图片生成处理器（角色/场景通用）
 * 支持同步和异步两种模型：
 *   - 同步模型：callAIModel 直接返回 image_url
 *   - 异步模型：callAIModel 返回 taskId，然后 queryAIModel 轮询直到完成
 * 
 * input:  { prompt, modelName, width, height }
 * output: { image_url, taskId?, tokens?, provider }
 * 
 * 约定：模型的 query_response_mapping 应映射出 status 和 image_url 字段
 */

const { callAIModel, queryAIModel } = require('../../aiModelService');

// 轮询配置
const POLL_CONFIG = {
  intervalMs: 3000,        // 轮询间隔 3 秒
  maxDurationMs: 300000,   // 最大等待 5 分钟
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
 * 从查询结果中提取图片 URL
 */
function extractImageUrl(queryResult) {
  const raw = queryResult._raw || queryResult;
  return queryResult.image_url
    || queryResult.url
    || raw.data?.task_result?.images?.[0]?.url
    || raw.data?.result?.image_url
    || raw.data?.image_url
    || raw.output?.image_url
    || null;
}

async function handleImageGeneration(inputParams, onProgress) {
  const { prompt, modelName, width, height } = inputParams;
  const selectedModel = modelName || 'Default Image Model';

  // === 第一步：提交生成请求 ===
  if (onProgress) onProgress(10);

  const submitResult = await callAIModel(selectedModel, {
    prompt,
    width: width || 1024,
    height: height || 1024
  });

  if (onProgress) onProgress(30);

  // 同步模型：直接返回了图片
  const directUrl = submitResult.image_url || submitResult.url;
  if (directUrl && !submitResult.taskId) {
    if (onProgress) onProgress(100);
    return {
      image_url: directUrl,
      tokens: submitResult.tokens || 0,
      provider: submitResult._model?.provider || 'unknown'
    };
  }

  // 异步模型：需要轮询
  if (!submitResult.taskId) {
    throw new Error('模型既未返回图片 URL 也未返回 taskId，无法继续');
  }

  // === 第二步：轮询查询 ===
  const { _raw, _model, ...queryFields } = submitResult;
  
  const startTime = Date.now();
  let networkErrors = 0;
  let pollCount = 0;

  console.log(`[ImageGen] 异步任务已提交, taskId=${submitResult.taskId}, 开始轮询...`);

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
      console.warn(`[ImageGen] 第 ${pollCount} 次查询网络错误 (${networkErrors}/${POLL_CONFIG.maxNetworkErrors}):`, err.message);
      
      if (networkErrors >= POLL_CONFIG.maxNetworkErrors) {
        throw new Error(`轮询失败：连续 ${networkErrors} 次网络错误，最后一次: ${err.message}`);
      }
      continue;
    }

    const status = resolveStatus(queryResult);
    console.log(`[ImageGen] 第 ${pollCount} 次查询, status=${status}, elapsed=${Math.round(elapsed / 1000)}s`);

    if (status === 'success') {
      const imageUrl = extractImageUrl(queryResult);
      if (!imageUrl) {
        console.warn('[ImageGen] 任务成功但未找到图片 URL，原始数据:', JSON.stringify(queryResult._raw || queryResult));
      }
      if (onProgress) onProgress(100);
      return {
        image_url: imageUrl,
        taskId: submitResult.taskId,
        tokens: submitResult.tokens || queryResult.tokens || 0,
        provider: submitResult._model?.provider || 'unknown'
      };
    }

    if (status === 'failed') {
      const errorMsg = queryResult.error || queryResult.message 
        || queryResult._raw?.message || queryResult._raw?.data?.message
        || '未知错误';
      throw new Error(`图片生成失败: ${errorMsg} (taskId: ${submitResult.taskId})`);
    }

    // status === 'pending'，继续轮询
  }
}

module.exports = handleImageGeneration;
