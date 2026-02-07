const { queryOne } = require('./dbHelper');
const fetch = require('node-fetch');
const {
  renderTemplate,
  renderJsonTemplate,
  extractValueByPath,
  mapResponse,
  mergeParams
} = require('./utils/templateRenderer');
const { getHandler } = require('./customHandlers');

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
    
    // === 自定义 Handler 拦截 ===
    // 模板渲染完成后，如果配置了 custom_handler，则交给 handler 处理请求
    if (model.custom_handler) {
      const handler = getHandler(model.custom_handler);
      if (handler && typeof handler.call === 'function') {
        console.log(`[AI Model] 使用自定义 handler "${model.custom_handler}" 处理提交请求`);
        
        // 解析渲染后的 body 为对象（handler 拿到的是对象，不是字符串）
        let bodyObj = null;
        if (requestOptions.body) {
          try { bodyObj = JSON.parse(requestOptions.body); } catch { bodyObj = requestOptions.body; }
        }
        
        const rendered = {
          url,
          method: requestOptions.method,
          headers: { ...headers },
          body: bodyObj
        };
        
        // handler 返回原始 API 响应 data
        const data = await handler.call(model, mergedParams, rendered);
        
        // 外层统一做 response_mapping
        const result = mapResponse(data, responseMapping);
        result._raw = data;
        result._model = {
          name: model.name,
          provider: model.provider,
          category: model.category,
          priceConfig
        };
        return result;
      } else {
        console.warn(`[AI Model] custom_handler "${model.custom_handler}" 未找到或缺少 call 方法，回退到模板流程`);
      }
    }
    
    // === 默认模板 fetch 流程 ===
    // 发送请求
    console.log(`[AI Model] Calling ${modelName}:`, url);
    console.log('[AI Model] Request Method:', requestOptions.method);
    console.log('[AI Model] Request Headers:', JSON.stringify(requestOptions.headers, null, 2));
    if (requestOptions.body) {
      try {
        const bodyObj = JSON.parse(requestOptions.body);
        const fields = Object.keys(bodyObj);
        console.log(`[AI Model] Request Body 字段列表: [${fields.join(', ')}]`);
        for (const key of fields) {
          const val = typeof bodyObj[key] === 'string' ? bodyObj[key] : JSON.stringify(bodyObj[key]);
          console.log(`[AI Model]   ${key}: ${val.substring(0, 200)}${val.length > 200 ? '...' : ''}`);
        }
      } catch (e) {
        // 尝试以 form-urlencoded 解析
        try {
          const formParams = new URLSearchParams(requestOptions.body);
          const fields = [...formParams.keys()];
          console.log(`[AI Model] Request Body (form-urlencoded) 字段列表: [${fields.join(', ')}]`);
          for (const key of fields) {
            const val = formParams.get(key) || '';
            console.log(`[AI Model]   ${key}: ${val.substring(0, 200)}${val.length > 200 ? '...' : ''}`);
          }
        } catch (e2) {
          console.log('[AI Model] Request Body (未知格式):', requestOptions.body.substring(0, 200));
        }
      }
    }
    
    // 添加超时控制（600秒）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600000);
    
    let data;
    let response;
    try {
      response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      console.log('[AI Model] Response Status:', response.status, response.statusText);
      console.log('[AI Model] Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
      // 获取响应文本
      const responseText = await response.text();
      console.log('[AI Model] Response Text (first 500 chars):', responseText.substring(0, 500));
    
      // 尝试解析 JSON
      try {
        data = JSON.parse(responseText);
        const dataStr = JSON.stringify(data, null, 2);
        console.log('[AI Model] Response Data (first 100 chars):', dataStr.substring(0, 100) + (dataStr.length > 100 ? '...' : ''));
      } catch (parseError) {
        console.error('[AI Model] JSON Parse Error:', parseError.message);
        console.error('[AI Model] Raw Response:', responseText);
        throw new Error(`API 返回的不是有效的 JSON 格式。响应内容: ${responseText.substring(0, 200)}...`);
      }
      
      if (!response.ok) {
        throw new Error(data.error?.message || `API 调用失败: ${response.status}`);
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        console.error('[AI Model] Request timeout after 600 seconds');
        throw new Error('API 请求超时（600秒），请稍后重试');
      }
      console.error('[AI Model] Network error:', fetchError.message);
      throw new Error(`网络请求失败: ${fetchError.message}。请检查网络连接或稍后重试`);
    }
    
    // 使用 mapResponse 提取字段（更简洁）
    const result = mapResponse(data, responseMapping);
    
    // 添加原始响应和模型信息
    // 根据 Content-Type 决定如何保存请求体
    let requestBody = null;
    if (requestOptions.body) {
      const contentType = requestOptions.headers['Content-Type'] || requestOptions.headers['content-type'] || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        // URL 编码格式，保存原始字符串
        requestBody = requestOptions.body;
      } else {
        // JSON 格式，解析为对象
        try {
          requestBody = JSON.parse(requestOptions.body);
        } catch (e) {
          requestBody = requestOptions.body; // 解析失败则保存原始字符串
        }
      }
    }
    
    result._raw = {
      ...data,
      request: {
        url,
        method: requestOptions.method,
        headers: requestOptions.headers,
        body: requestBody
      },
      headers: Object.fromEntries(response.headers.entries())
    };
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
 * 统一的 AI 模型查询接口（用于异步任务轮询）
 * 使用模型配置中的 query_* 字段构建请求
 * @param {string} modelName - 模型名称
 * @param {object} params - 查询参数（提交接口映射结果的字段，会替换查询模板中的占位符）
 * @param {string} apiKey - API 密钥（可选）
 * @returns {Promise<object>} - 返回映射后的查询响应
 */
async function queryAIModel(modelName, params = {}, apiKey = null) {
  try {
    const model = await queryOne(
      'SELECT * FROM ai_model_configs WHERE name = ? AND is_active = 1',
      [modelName]
    );

    if (!model) {
      throw new Error(`模型 "${modelName}" 不存在或未启用`);
    }

    if (!model.query_url_template) {
      throw new Error(`模型 "${modelName}" 未配置查询接口`);
    }

    // API Key
    if (!apiKey) {
      if (model.api_key) {
        apiKey = model.api_key;
      } else {
        const envKey = `${model.provider.toUpperCase()}_API_KEY`;
        apiKey = process.env[envKey];
      }
    }

    const mergedParams = { ...params, apiKey };

    // 渲染查询 URL
    const url = renderTemplate(model.query_url_template, mergedParams);

    // 渲染查询 Headers
    const queryHeadersTemplate = model.query_headers_template
      ? (typeof model.query_headers_template === 'string' ? JSON.parse(model.query_headers_template) : model.query_headers_template)
      : {};
    const headers = renderJsonTemplate(queryHeadersTemplate, mergedParams);

    // 构建请求
    const queryMethod = model.query_method || 'GET';
    const requestOptions = { method: queryMethod, headers };

    // 渲染查询 Body（根据 Content-Type 选择编码方式）
    const queryBodyTemplate = model.query_body_template
      ? (typeof model.query_body_template === 'string' ? JSON.parse(model.query_body_template) : model.query_body_template)
      : null;

    if (queryBodyTemplate && queryMethod !== 'GET') {
      const renderedBody = renderJsonTemplate(queryBodyTemplate, mergedParams);
      const contentType = headers['Content-Type'] || headers['content-type'] || '';

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const urlParams = new URLSearchParams();
        for (const [key, value] of Object.entries(renderedBody)) {
          urlParams.append(key, String(value));
        }
        requestOptions.body = urlParams.toString();
      } else {
        requestOptions.body = JSON.stringify(renderedBody);
      }
    }

    // === 自定义 Query Handler 拦截 ===
    if (model.custom_query_handler) {
      const handler = getHandler(model.custom_query_handler);
      if (handler && typeof handler.query === 'function') {
        console.log(`[AI Model Query] 使用自定义 handler "${model.custom_query_handler}" 处理查询请求`);
        
        let bodyObj = null;
        if (requestOptions.body) {
          try { bodyObj = JSON.parse(requestOptions.body); } catch { bodyObj = requestOptions.body; }
        }
        
        const rendered = {
          url,
          method: queryMethod,
          headers: { ...headers },
          body: bodyObj
        };
        
        // handler 返回原始 API 响应 data
        const data = await handler.query(model, mergedParams, rendered);
        console.log('[AI Model Query] Response:', JSON.stringify(data, null, 2));
        
        // 外层统一做 query_response_mapping
        const queryResponseMapping = model.query_response_mapping
          ? (typeof model.query_response_mapping === 'string' ? JSON.parse(model.query_response_mapping) : model.query_response_mapping)
          : null;
        
        let result = data;
        if (queryResponseMapping) {
          result = mapResponse(data, queryResponseMapping);
          result._raw = data;
        }
        return result;
      } else {
        console.warn(`[AI Model Query] custom_query_handler "${model.custom_query_handler}" 未找到或缺少 query 方法，回退到模板流程`);
      }
    }
    
    // === 默认模板 fetch 流程 ===
    console.log(`[AI Model Query] Querying ${modelName}:`, url);
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    console.log('[AI Model Query] Response:', JSON.stringify(data, null, 2));

    // 使用查询响应映射
    const queryResponseMapping = model.query_response_mapping
      ? (typeof model.query_response_mapping === 'string' ? JSON.parse(model.query_response_mapping) : model.query_response_mapping)
      : null;

    let result = data;
    if (queryResponseMapping) {
      result = mapResponse(data, queryResponseMapping);
      result._raw = data;
    }

    return result;
  } catch (error) {
    console.error(`[AI Model Query] Error querying ${modelName}:`, error);
    throw error;
  }
}

/**
 * 获取所有启用的文本模型列表
 */
async function getTextModels() {
  const { queryAll } = require('./dbHelper');
  const models = await queryAll(
    "SELECT id, name, provider, category, description FROM ai_model_configs WHERE category = 'TEXT' AND is_active = 1 ORDER BY id ASC"
  );
  return models;
}

/**
 * 获取所有启用的图片模型列表
 */
async function getImageModels() {
  const { queryAll } = require('./dbHelper');
  const models = await queryAll(
    "SELECT id, name, provider, category, description FROM ai_model_configs WHERE category = 'IMAGE' AND is_active = 1 ORDER BY id ASC"
  );
  return models;
}

module.exports = {
  callAIModel,
  queryAIModel,
  getTextModels,
  getImageModels
};
