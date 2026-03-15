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
    return !!_safeEval(mappedResult, conditionExpr);
  } catch (err) {
    console.warn('[PollUtils] 条件表达式执行失败:', conditionExpr, err.message);
    return false;
  }
}

/**
 * 安全条件表达式求值器（递归下降解析器）
 * 
 * 仅支持：== != || && 运算符、字符串/数字字面量、变量标识符、括号分组
 * 不使用 eval / new Function，杜绝代码注入风险
 */
function _safeEval(vars, expr) {
  let pos = 0;

  function peek() { skipSpaces(); return expr[pos]; }
  function skipSpaces() { while (pos < expr.length && expr[pos] === ' ') pos++; }

  // 词法：读取一个 token
  function readToken() {
    skipSpaces();
    if (pos >= expr.length) return null;
    const ch = expr[pos];

    // 字符串字面量
    if (ch === '"' || ch === "'") {
      const quote = ch;
      pos++;
      let str = '';
      while (pos < expr.length && expr[pos] !== quote) {
        if (expr[pos] === '\\' && pos + 1 < expr.length) { pos++; str += expr[pos]; }
        else { str += expr[pos]; }
        pos++;
      }
      if (pos < expr.length) pos++; // 跳过闭合引号
      return { type: 'string', value: str };
    }

    // 数字字面量
    if (ch >= '0' && ch <= '9') {
      let num = '';
      while (pos < expr.length && ((expr[pos] >= '0' && expr[pos] <= '9') || expr[pos] === '.')) {
        num += expr[pos]; pos++;
      }
      return { type: 'number', value: Number(num) };
    }

    // 运算符
    if (ch === '=' && expr[pos + 1] === '=') { pos += 2; return { type: 'op', value: '==' }; }
    if (ch === '!' && expr[pos + 1] === '=') { pos += 2; return { type: 'op', value: '!=' }; }
    if (ch === '|' && expr[pos + 1] === '|') { pos += 2; return { type: 'op', value: '||' }; }
    if (ch === '&' && expr[pos + 1] === '&') { pos += 2; return { type: 'op', value: '&&' }; }

    // 括号
    if (ch === '(') { pos++; return { type: 'paren', value: '(' }; }
    if (ch === ')') { pos++; return { type: 'paren', value: ')' }; }

    // 标识符（变量名）
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = '';
      while (pos < expr.length && /[a-zA-Z0-9_$]/.test(expr[pos])) {
        id += expr[pos]; pos++;
      }
      return { type: 'ident', value: id };
    }

    throw new Error(`不支持的字符: '${ch}' (位置 ${pos})`);
  }

  // 向前看 token（带回退）
  const tokenCache = [];
  function nextToken() {
    if (tokenCache.length > 0) return tokenCache.shift();
    return readToken();
  }
  function pushBack(tok) { if (tok) tokenCache.unshift(tok); }

  // 解析基本值
  function parsePrimary() {
    const tok = nextToken();
    if (!tok) throw new Error('表达式意外结束');
    if (tok.type === 'string') return tok.value;
    if (tok.type === 'number') return tok.value;
    if (tok.type === 'ident') {
      const v = vars[tok.value];
      return (v === undefined || v === null) ? '' : v;
    }
    if (tok.type === 'paren' && tok.value === '(') {
      const val = parseOr();
      const close = nextToken();
      if (!close || close.value !== ')') throw new Error('缺少闭合括号');
      return val;
    }
    throw new Error(`不支持的 token: ${JSON.stringify(tok)}`);
  }

  // 解析比较 == !=
  function parseComparison() {
    let left = parsePrimary();
    while (true) {
      const tok = nextToken();
      if (!tok || tok.type !== 'op') { pushBack(tok); return left; }
      if (tok.value === '==') { left = (String(left) === String(parsePrimary())); continue; }
      if (tok.value === '!=') { left = (String(left) !== String(parsePrimary())); continue; }
      pushBack(tok); return left;
    }
  }

  // 解析 &&
  function parseAnd() {
    let left = parseComparison();
    while (true) {
      const tok = nextToken();
      if (tok && tok.type === 'op' && tok.value === '&&') { left = parseComparison() && left; continue; }
      pushBack(tok); return left;
    }
  }

  // 解析 ||
  function parseOr() {
    let left = parseAnd();
    while (true) {
      const tok = nextToken();
      if (tok && tok.type === 'op' && tok.value === '||') { left = parseAnd() || left; continue; }
      pushBack(tok); return left;
    }
  }

  const result = parseOr();
  // 确保表达式完全消费
  const remaining = nextToken();
  if (remaining) {
    throw new Error(`表达式末尾有多余内容: ${JSON.stringify(remaining)}`);
  }
  return result;
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
    intervalMs = 2000,
    maxDurationMs = 300000,
    maxNetworkErrors = 5,
    onProgress,
    progressStart = 30,
    progressEnd = 90,
    logTag = 'PollUtils',
    adaptiveInterval = true, // 启用自适应轮询间隔
    intervalMultiplier = 1.3, // 每次轮询间隔增长系数
    maxIntervalMs = 10000 // 最大轮询间隔
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
  let currentInterval = intervalMs;

  console.log(`[${logTag}] 异步任务已提交, taskId=${taskId}, 开始轮询 (初始间隔=${intervalMs}ms, 自适应=${adaptiveInterval})...`);

  while (true) {
    await sleep(currentInterval);
    pollCount++;
    const elapsed = Date.now() - startTime;

    // 自适应增加轮询间隔，减少不必要的请求
    if (adaptiveInterval && currentInterval < maxIntervalMs) {
      currentInterval = Math.min(Math.round(currentInterval * intervalMultiplier), maxIntervalMs);
    }

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
      const totalMs = Date.now() - startTime;
      console.log(`[${logTag}] ✅ 任务完成: model=${modelName}, taskId=${taskId}, 耗时=${Math.round(totalMs / 1000)}s, 轮询${pollCount}次`);
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
