/**
 * AI 模型配置加载器
 * 从数据库读取模型配置信息
 */

const { queryOne } = require('../../../dbHelper');

/**
 * 从数据库加载 AI 模型配置
 * @param {string} modelName - 模型名称
 * @returns {Promise<object>} 模型配置对象（包含 _rawModel 原始数据库记录）
 * @throws {Error} 模型不存在或未启用
 */
async function loadModelConfig(modelName) {
  if (!modelName) {
    throw new Error('模型名称不能为空');
  }

  const model = await queryOne(
    'SELECT * FROM ai_model_configs WHERE name = ? AND is_active = 1',
    [modelName]
  );

  if (!model) {
    throw new Error(`模型 "${modelName}" 不存在或未启用`);
  }

  // 解析 JSON 字段
  const config = {
    name: model.name,
    provider: model.provider,
    category: model.category,
    apiKey: model.api_key,

    // URL 和请求方法
    urlTemplate: model.url_template,
    requestMethod: model.request_method,

    // 模板配置
    headersTemplate: parseJsonField(model.headers_template),
    bodyTemplate: parseJsonField(model.body_template),
    defaultParams: parseJsonField(model.default_params),

    // 查询配置（用于异步任务轮询）
    queryUrlTemplate: model.query_url_template,
    queryMethod: model.query_method,
    queryHeadersTemplate: parseJsonField(model.query_headers_template),
    queryBodyTemplate: parseJsonField(model.query_body_template),

    // 响应映射
    responseMapping: parseJsonField(model.response_mapping),
    queryResponseMapping: parseJsonField(model.query_response_mapping),

    // 自定义处理器
    customHandler: model.custom_handler,
    customQueryHandler: model.custom_query_handler,
    billingHandler: model.billing_handler,
    billingQueryHandler: model.billing_query_handler,

    // 价格配置
    priceConfig: parseJsonField(model.price_config),

    // 保留原始数据库记录（供 custom_handler 使用）
    _rawModel: model
  };

  return config;
}

/**
 * 解析 JSON 字段（兼容字符串和对象）
 * @param {string|object} field - JSON 字段
 * @returns {object|null} 解析后的对象
 */
function parseJsonField(field) {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      console.warn('[Model Config Loader] JSON 解析失败:', e.message);
      return null;
    }
  }
  return field;
}

/**
 * 获取 API Key（优先级：模型配置 > 环境变量）
 * @param {object} config - 模型配置
 * @returns {string} API Key
 * @throws {Error} API Key 未配置
 */
function getApiKey(config) {
  if (config.apiKey) {
    return config.apiKey;
  }

  const envKey = `${config.provider.toUpperCase()}_API_KEY`;
  const apiKey = process.env[envKey];

  if (!apiKey) {
    throw new Error(
      `API Key 未配置：请在模型配置中设置 API Key 或配置环境变量 ${envKey}`
    );
  }

  return apiKey;
}

module.exports = {
  loadModelConfig,
  getApiKey
};
