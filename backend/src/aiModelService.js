const { queryOne } = require('./dbHelper');
const fetch = require('node-fetch');
const {
  renderTemplate,
  renderJsonTemplate,
  extractValueByPath,
  mapResponse,
  mergeParams
} = require('./utils/templateRenderer');

/**
 * 统一的 AI 模型调用接口
 * @param {string} modelName - 模型名称（如 'DeepSeek Chat'）
 * @param {object} params - 调用参数（会替换模板中的占位符）
 * @param {string} apiKey - API 密钥（可选，默认从环境变量获取）
 * @returns {Promise<object>} - 返回映射后的响应数据
 */
async function callAIModel(modelName, params = {}, apiKey = null) {
  try {
    // 从数据库获取模型配置
    const model = await queryOne(
      'SELECT * FROM ai_model_configs WHERE name = ? AND is_active = 1',
      [modelName]
    );
    
    if (!model) {
      throw new Error(`模型 "${modelName}" 不存在或未启用`);
    }
    
    // 解析 JSON 字段
    const priceConfig = typeof model.price_config === 'string' 
      ? JSON.parse(model.price_config) 
      : model.price_config;
    
    const headersTemplate = typeof model.headers_template === 'string'
      ? JSON.parse(model.headers_template)
      : model.headers_template;
    
    const bodyTemplate = model.body_template 
      ? (typeof model.body_template === 'string' ? JSON.parse(model.body_template) : model.body_template)
      : null;
    
    const defaultParams = model.default_params
      ? (typeof model.default_params === 'string' ? JSON.parse(model.default_params) : model.default_params)
      : {};
    
    const responseMapping = typeof model.response_mapping === 'string'
      ? JSON.parse(model.response_mapping)
      : model.response_mapping;
    
    // 合并默认参数和传入参数
    const mergedParams = { ...defaultParams, ...params };
    
    // API Key 优先级：1. 数据库配置 2. 函数参数 3. 环境变量
    if (!apiKey) {
      // 优先使用数据库中的 api_key
      if (model.api_key) {
        apiKey = model.api_key;
      } else {
        // 从环境变量获取
        const envKey = `${model.provider.toUpperCase()}_API_KEY`;
        apiKey = process.env[envKey];
        
        if (!apiKey) {
          throw new Error(`API Key 未配置：请在模型配置中设置 API Key 或配置环境变量 ${envKey}`);
        }
      }
    }
    
    // 添加 apiKey 到参数中
    mergedParams.apiKey = apiKey;
    
    // 渲染 URL
    const url = renderTemplate(model.url_template, mergedParams);
    
    // 使用 renderJsonTemplate 渲染 Headers（支持嵌套对象）
    const headers = renderJsonTemplate(headersTemplate, mergedParams);
    
    // 构建请求选项
    const requestOptions = {
      method: model.request_method,
      headers
    };
    
    // 如果有 body 模板，使用 renderJsonTemplate 渲染（支持嵌套对象）
    if (bodyTemplate && (model.request_method === 'POST' || model.request_method === 'PUT')) {
      const renderedBody = renderJsonTemplate(bodyTemplate, mergedParams);
      
      // 根据 Content-Type 决定序列化方式
      const contentType = headers['Content-Type'] || headers['content-type'] || '';
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        // URL 编码格式
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(renderedBody)) {
          params.append(key, String(value));
        }
        requestOptions.body = params.toString();
      } else {
        // 默认使用 JSON 格式
        requestOptions.body = JSON.stringify(renderedBody);
      }
    }
    
    // 发送请求
    console.log(`[AI Model] Calling ${modelName}:`, url);
    console.log('[AI Model] Request Method:', requestOptions.method);
    console.log('[AI Model] Request Headers:', JSON.stringify(requestOptions.headers, null, 2));
    if (requestOptions.body) {
      console.log('[AI Model] Request Body:', requestOptions.body);
    }
    
    const response = await fetch(url, requestOptions);
    console.log('[AI Model] Response Status:', response.status, response.statusText);
    console.log('[AI Model] Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    const data = await response.json();
    console.log('[AI Model] Response Data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(data.error?.message || `API 调用失败: ${response.status}`);
    }
    
    // 使用 mapResponse 提取字段（更简洁）
    const result = mapResponse(data, responseMapping);
    
    // 添加原始响应和模型信息
    result._raw = data;
    result._model = {
      name: model.name,
      provider: model.provider,
      category: model.category,
      priceConfig
    };
    
    return result;
  } catch (error) {
    console.error(`[AI Model] Error calling ${modelName}:`, error);
    throw error;
  }
}

/**
 * 获取所有启用的文本模型列表
 */
async function getTextModels() {
  const { queryAll } = require('./dbHelper');
  const models = await queryAll(
    "SELECT id, name, provider, description FROM ai_model_configs WHERE category = 'TEXT' AND is_active = 1 ORDER BY id ASC"
  );
  return models;
}

module.exports = {
  callAIModel,
  getTextModels
};
