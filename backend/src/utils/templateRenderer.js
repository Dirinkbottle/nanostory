/**
 * 模板渲染工具 - 支持 Mustache 风格的占位符替换
 * 支持嵌套 JSON 结构和路径访问
 */

/**
 * 渲染模板字符串，替换 {{key}} 占位符
 * 统一处理所有 {{}} 包裹的占位符，不区分是否有引号
 * 
 * 特别处理 URL 参数：如果是 URL 模板，会自动进行 URL 编码
 */
function renderTemplate(template, data) {
  if (!template) return template;
  
  // 判断是否是 URL 模板（包含 http:// 或 https:// 或 ?）
  const isUrl = /^https?:\/\//.test(template) || template.includes('?');
  
  // 统一替换所有 {{key}} 占位符（不管是否有引号）
  return template.replace(/{{(\w+)}}/g, (match, key) => {
    const value = data[key];
    if (value === undefined) return match;
    if (typeof value === 'object') return JSON.stringify(value);
    // URL 参数需要编码
    return isUrl ? encodeURIComponent(String(value)) : String(value);
  });
}

/**
 * 渲染 JSON 对象模板，递归替换所有占位符
 * 支持两种模式：
 * 1. "{{key}}" - 字符串形式，会先替换为 JSON 字符串再解析
 * 2. {{key}} - 无引号形式（仅在 JS 对象中使用）
 */
function renderJsonTemplate(template, data) {
  if (!template) return template;
  
  // 先将整个模板转为 JSON 字符串
  let jsonStr = JSON.stringify(template);
  
  // 1. 替换纯占位符（如 "{{messages}}" -> 数组/对象）
  jsonStr = jsonStr.replace(/"{{(\w+)}}"/g, (match, key) => {
    const value = data[key];
    if (value === undefined) return match;
    // 将值序列化为 JSON（保持类型）
    return JSON.stringify(value);
  });
  
  // 2. 替换字符串内的占位符（如 "Bearer {{apiKey}}" -> "Bearer sk-xxx"）
  jsonStr = jsonStr.replace(/{{(\w+)}}/g, (match, key) => {
    const value = data[key];
    if (value === undefined) return match;
    // 字符串内的占位符，直接替换为值（不需要 JSON.stringify）
    return String(value);
  });
  
  // 解析回对象
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('JSON parse error:', error, 'String:', jsonStr);
    return template;
  }
}

/**
 * 从嵌套对象中提取值，支持路径访问如 "data.task_id" 或 "choices.0.message.content"
 */
function extractValueByPath(obj, path) {
  if (!path) return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return null;
    
    // 支持数组索引（如 "choices.0" 或 "data[0]"）
    if (key.includes('[') && key.includes(']')) {
      const arrayKey = key.substring(0, key.indexOf('['));
      const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
      current = current?.[arrayKey]?.[index];
    } else {
      current = current[key];
    }

    if (current === undefined) return undefined;
  }

  return current;
}

/**
 * 根据响应映射提取标准化的响应数据
 */
function mapResponse(rawResponse, mapping) {
  const result = {};

  for (const [standardKey, responsePath] of Object.entries(mapping)) {
    result[standardKey] = extractValueByPath(rawResponse, responsePath);
  }

  return result;
}

/**
 * 合并默认参数和运行时参数
 */
function mergeParams(defaultParams, runtimeParams) {
  return {
    ...defaultParams,
    ...runtimeParams
  };
}

/**
 * 构建完整的 HTTP 请求对象
 */
function buildRequest(config, runtimeParams) {
  const params = mergeParams(config.defaultParams, runtimeParams);

  const url = renderTemplate(config.urlTemplate, params);
  const headers = renderJsonTemplate(config.headersTemplate, params);
  const body = config.bodyTemplate
    ? renderJsonTemplate(config.bodyTemplate, params)
    : undefined;

  return {
    method: config.requestMethod,
    url,
    headers,
    body
  };
}

/**
 * 构建查询请求对象（用于轮询任务状态）
 */
function buildQueryRequest(config, runtimeParams) {
  if (!config.queryUrlTemplate) return null;

  const params = mergeParams(config.defaultParams, runtimeParams);

  const url = renderTemplate(config.queryUrlTemplate, params);
  const headers = config.queryHeadersTemplate
    ? renderJsonTemplate(config.queryHeadersTemplate, params)
    : {};
  const body = config.queryBodyTemplate
    ? renderJsonTemplate(config.queryBodyTemplate, params)
    : undefined;

  return {
    method: config.queryMethod || 'GET',
    url,
    headers,
    body
  };
}

module.exports = {
  renderTemplate,
  renderJsonTemplate,
  extractValueByPath,
  mapResponse,
  mergeParams,
  buildRequest,
  buildQueryRequest
};
