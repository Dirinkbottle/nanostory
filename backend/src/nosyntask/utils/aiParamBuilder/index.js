/**
 * AI 参数构建器 - 主入口
 *
 * 自动从数据库读取 AI 模型配置，合并工作流参数和用户参数，
 * 检测重复参数并输出警告，最终返回渲染好的请求对象。
 *
 * 使用示例：
 * ```javascript
 * const { buildAIRequest } = require('./utils/aiParamBuilder');
 *
 * const request = await buildAIRequest({
 *   modelName: 'DeepSeek Chat',
 *   workflowParams: { prompt: '生成一个故事' },
 *   userParams: { temperature: 0.7 }
 * });
 *
 * // request = { url, method, headers, body }
 * // 然后调用者自己发送请求
 * ```
 */

const { loadModelConfig, getApiKey } = require('./modelConfigLoader');
const { mergeParameters, filterUndefinedParams } = require('./parameterMerger');
const { buildRequest, buildQueryRequest, serializeBody } = require('./requestBuilder');

/**
 * 构建 AI 模型请求对象
 *
 * @param {object} options - 配置选项
 * @param {string} options.modelName - 模型名称（必需）
 * @param {object} [options.workflowParams={}] - 工作流传入的参数（优先级最高）
 * @param {object} [options.userParams={}] - 用户传入的参数（优先级中等）
 * @param {string} [options.apiKey] - API 密钥（可选，默认从模型配置或环境变量获取）
 * @param {boolean} [options.serialize=true] - 是否序列化请求体为字符串（默认 true）
 *
 * @returns {Promise<object>} 请求对象
 * @returns {string} return.url - 请求 URL
 * @returns {string} return.method - 请求方法（GET/POST/PUT）
 * @returns {object} return.headers - 请求头
 * @returns {object|string|null} return.body - 请求体（对象或序列化后的字符串）
 * @returns {object} return._meta - 元信息（模型名称、提供商、分类等）
 *
 * @throws {Error} 模型不存在、参数缺失或渲染失败
 */
async function buildAIRequest(options) {
  const {
    modelName,
    workflowParams = {},
    userParams = {},
    apiKey = null,
    serialize = true
  } = options;

  if (!modelName) {
    throw new Error('[AI Param Builder] modelName 参数不能为空');
  }

  // 1. 从数据库加载模型配置
  console.log(`[AI Param Builder] 加载模型配置: ${modelName}`);
  const config = await loadModelConfig(modelName);

  // 2. 获取 API Key
  const resolvedApiKey = apiKey || getApiKey(config);

  // 3. 合并参数（检测重复并输出警告）
  const mergedParams = mergeParameters(
    workflowParams,
    userParams,
    config.defaultParams || {}
  );

  // 4. 添加 apiKey 到参数中
  mergedParams.apiKey = resolvedApiKey;

  // 5. 过滤 undefined 参数
  const cleanParams = filterUndefinedParams(mergedParams);

  // 6. 构建请求对象
  console.log(`[AI Param Builder] 构建请求对象`);
  const request = buildRequest(config, cleanParams);

  // 7. 序列化请求体（如果需要）
  if (serialize && request.body) {
    request.body = serializeBody(request.body, request.headers);
  }

  // 8. 添加元信息
  request._meta = {
    modelName: config.name,
    provider: config.provider,
    category: config.category,
    customHandler: config.customHandler,
    priceConfig: config.priceConfig
  };

  console.log(`[AI Param Builder] 请求构建完成: ${request.method} ${request.url}`);

  return request;
}

/**
 * 构建 AI 模型查询请求对象（用于异步任务轮询）
 *
 * @param {object} options - 配置选项
 * @param {string} options.modelName - 模型名称（必需）
 * @param {object} [options.queryParams={}] - 查询参数（通常是提交接口返回的 taskId 等）
 * @param {string} [options.apiKey] - API 密钥（可选）
 * @param {boolean} [options.serialize=true] - 是否序列化请求体为字符串（默认 true）
 *
 * @returns {Promise<object|null>} 查询请求对象或 null（如果模型不支持查询）
 *
 * @throws {Error} 模型不存在或参数缺失
 */
async function buildAIQueryRequest(options) {
  const {
    modelName,
    queryParams = {},
    apiKey = null,
    serialize = true
  } = options;

  if (!modelName) {
    throw new Error('[AI Param Builder] modelName 参数不能为空');
  }

  // 1. 从数据库加载模型配置
  const config = await loadModelConfig(modelName);

  // 2. 检查是否支持查询
  if (!config.queryUrlTemplate) {
    console.log(`[AI Param Builder] 模型 "${modelName}" 不支持查询接口`);
    return null;
  }

  // 3. 获取 API Key
  const resolvedApiKey = apiKey || getApiKey(config);

  // 4. 合并参数
  const mergedParams = {
    ...(config.defaultParams || {}),
    ...queryParams,
    apiKey: resolvedApiKey
  };

  // 5. 过滤 undefined 参数
  const cleanParams = filterUndefinedParams(mergedParams);

  // 6. 构建查询请求对象
  console.log(`[AI Param Builder] 构建查询请求对象`);
  const request = buildQueryRequest(config, cleanParams);

  if (!request) {
    return null;
  }

  // 7. 序列化请求体（如果需要）
  if (serialize && request.body) {
    request.body = serializeBody(request.body, request.headers);
  }

  // 8. 添加元信息
  request._meta = {
    modelName: config.name,
    provider: config.provider,
    category: config.category,
    customQueryHandler: config.customQueryHandler
  };

  console.log(`[AI Param Builder] 查询请求构建完成: ${request.method} ${request.url}`);

  return request;
}

module.exports = {
  buildAIRequest,
  buildAIQueryRequest
};
