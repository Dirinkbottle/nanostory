/**
 * 公共异步轮询组件
 * 
 * 统一处理：callAIModel 提交 → 判断同步/异步 → queryAIModel 轮询 → 用数据库配置判断成功/失败 → 返回映射结果
 * 
 * 所有任务（imageGeneration, videoGeneration, frameGeneration, sceneVideoGeneration）
 * 都通过此组件完成异步轮询，不再各自重复实现。
 * 
 * 依赖 ai_model_configs 表中的新字段：
 *   - query_success_condition:  JS 表达式，如 status == "succeed" || status == "completed"
 *   - query_fail_condition:     JS 表达式，如 status == "failed" || status == "error"
 *   - query_success_mapping:    成功时的字段映射，如 {"image_url": "data.task_result.images.0.url"}
 *   - query_fail_mapping:       失败时的字段映射，如 {"error": "data.fail_reason"}
 */

const { callAIModel, queryAIModel } = require('../../aiModelService');
const { queryOne } = require('../../dbHelper');
const { mapResponse } = require('../../utils/templateRenderer');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * 解析 JSON 字段（兼容字符串和对象）
 */
function parseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

/**
 * 用数据库配置的条件表达式判断状态
 * 
 * 条件表达式是简单的 JS 表达式，变量来自 query_response_mapping 的映射结果
 * 例如: status == "succeed" || status == "completed"
 * 
 * @param {object} mappedResult - query_response_mapping 映射出的字段（如 {status: "succeed"}）
 * @param {string} conditionExpr - JS 条件表达式
 * @returns {boolean}
 */
function evaluateCondition(mappedResult, conditionExpr) {
  if (!conditionExpr) return false;
  try {
    // 把映射结果的所有 key 作为局部变量注入
    const keys = Object.keys(mappedResult);
    const values = Object.values(mappedResult).map(v => 
      v === undefined || v === null ? '' : v
    );
    const fn = new Function(...keys, `return (${conditionExpr});`);
    return !!fn(...values);
  } catch (err) {
    console.warn('[PollUtils] 条件表达式执行失败:', conditionExpr, err.message);
    return false;
  }
}


/**
 * 提交 AI 模型请求并轮询结果
 * 
 * - 成功：返回 { status: true, ...映射结果, _submitResult }
 * - 失败：直接 throw Error（调用方无需判断 status）
 * - 超时/网络错误：直接 throw Error
 * 
 * @param {string} modelName - 模型名称
 * @param {object} submitParams - 提交给 callAIModel 的参数
 * @param {object} options - 轮询选项
 * @param {number} options.intervalMs - 轮询间隔（默认 3000）
 * @param {number} options.maxDurationMs - 最大等待时间（默认 300000）
 * @param {number} options.maxNetworkErrors - 连续网络错误上限（默认 5）
 * @param {function} options.onProgress - 进度回调 (percent: number) => void
 * @param {number} options.progressStart - 进度起始百分比（默认 30）
 * @param {number} options.progressEnd - 进度结束百分比（默认 90）
 * @param {string} options.logTag - 日志标签（默认 'PollUtils'）
 * @returns {Promise<object>} 成功时返回 { status: true, ...successMapping结果, _submitResult }
 * @throws {Error} 失败/超时/网络错误时抛出异常
 */
async function submitAndPoll(modelName, submitParams, options = {}) {
  const {
    intervalMs = 3000,
    maxDurationMs = 300000,
    maxNetworkErrors = 5,
    onProgress,
    progressStart = 30,
    progressEnd = 90,
    logTag = 'PollUtils'
  } = options;

  // === 1. 提交请求 ===
  const submitResult = await callAIModel(modelName, submitParams);

  // === 2. 加载模型的查询配置 ===
  const modelConfig = await queryOne(
    'SELECT query_success_condition, query_fail_condition, query_success_mapping, query_fail_mapping, query_response_mapping FROM ai_model_configs WHERE name = ? AND is_active = 1',
    [modelName]
  );

  const successCondition = modelConfig?.query_success_condition || null;
  const failCondition = modelConfig?.query_fail_condition || null;
  const successMapping = parseJson(modelConfig?.query_success_mapping);
  const failMapping = parseJson(modelConfig?.query_fail_mapping);

  // === 3. 检查是否同步返回（无 taskId） ===
  const taskId = submitResult.taskId || submitResult.task_id || submitResult.task_Id;
  const hasDirectResult = !taskId;

  if (hasDirectResult) {
    // 同步模型，直接成功
    let mapped = submitResult;
    if (successMapping && submitResult._raw) {
      mapped = mapResponse(submitResult._raw, successMapping);
    }
    return { status: true, ...mapped, _submitResult: submitResult };
  }

  // === 4. 异步模型：轮询 ===
  const { _raw, _model, ...queryFields } = submitResult;

  const startTime = Date.now();
  let networkErrors = 0;
  let pollCount = 0;

  console.log(`[${logTag}] 异步任务已提交, taskId=${taskId}, 开始轮询...`);

  while (true) {
    await sleep(intervalMs);
    pollCount++;
    const elapsed = Date.now() - startTime;

    // 超时检查
    if (elapsed > maxDurationMs) {
      throw new Error(`轮询超时：已等待 ${Math.round(elapsed / 1000)} 秒 (taskId: ${taskId})`);
    }

    // 更新进度
    if (onProgress) {
      const ratio = Math.min(elapsed / maxDurationMs, 1);
      const progress = Math.round(progressStart + ratio * (progressEnd - progressStart));
      onProgress(Math.min(progress, progressEnd));
    }

    // 查询
    let queryResult;
    try {
      queryResult = await queryAIModel(modelName, queryFields);
      networkErrors = 0;
    } catch (err) {
      networkErrors++;
      console.warn(`[${logTag}] 第 ${pollCount} 次查询网络错误 (${networkErrors}/${maxNetworkErrors}):`, err.message);
      if (networkErrors >= maxNetworkErrors) {
        throw new Error(`轮询失败：连续 ${networkErrors} 次网络错误: ${err.message}`);
      }
      continue;
    }

    // === 5. 判断状态 ===
    const rawData = queryResult._raw || queryResult;
    const mappedBase = { ...queryResult };
    delete mappedBase._raw;

    // 必须配置条件表达式，否则无法判断状态
    if (!successCondition && !failCondition) {
      throw new Error(`模型 "${modelName}" 未配置 query_success_condition / query_fail_condition，无法判断异步任务状态。请在管理后台配置。`);
    }

    const isSuccess = evaluateCondition(mappedBase, successCondition);
    const isFail = evaluateCondition(mappedBase, failCondition);
    const resolvedStatus = isSuccess ? 'success' : isFail ? 'failed' : 'pending';

    console.log(`[${logTag}] 第 ${pollCount} 次查询, status=${resolvedStatus}, elapsed=${Math.round(elapsed / 1000)}s`);

    if (resolvedStatus === 'success') {
      let mapped;
      if (successMapping) {
        mapped = mapResponse(rawData, successMapping);
      } else {
        mapped = mappedBase;
      }
      // 统一返回 status: true + 映射结果
      return { status: true, ...mapped, _submitResult: submitResult };
    }

    if (resolvedStatus === 'failed') {
      // 提取错误信息后直接 throw
      let errorInfo;
      if (failMapping) {
        errorInfo = mapResponse(rawData, failMapping);
      } else {
        errorInfo = {
          error: mappedBase.error || mappedBase.message
            || rawData?.message || rawData?.data?.message
            || rawData?.data?.fail_reason
            || '未知错误'
        };
      }
      const errorMsg = errorInfo.error || errorInfo.message || errorInfo.fail_reason || '未知错误';
      throw new Error(`${errorMsg} (taskId: ${taskId})`);
    }

    // pending，继续轮询
  }
}

module.exports = {
  submitAndPoll,
  sleep,
  evaluateCondition
};
