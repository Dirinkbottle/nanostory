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
 * 遇到 {{key}} 占位符就整体替换：
 * - 如果值存在：替换为对应的值（保持类型）
 * - 如果值不存在（undefined/null）：标记该字段删除
 */
function renderJsonTemplate(template, data) {
  if (!template) return template;
  
  // 递归处理对象/数组
  function processValue(value) {
    if (typeof value === 'string') {
      // 检查是否是纯占位符 "{{key}}"
      const pureMatch = value.match(/^{{(\w+)}}$/);
      if (pureMatch) {
        const key = pureMatch[1];
        const dataValue = data[key];
        // 如果值不存在，标记删除
        if (dataValue === undefined || dataValue === null) {
          return '__REMOVE_FIELD__';
        }
        // 返回实际值（保持类型）
        return dataValue;
      }
      
      // 字符串内包含占位符（如 "Bearer {{apiKey}}"）
      if (value.includes('{{')) {
        let result = value;
        result = result.replace(/{{(\w+)}}/g, (match, key) => {
          const dataValue = data[key];
          if (dataValue === undefined || dataValue === null) {
            return '__REMOVE_FIELD__';
          }
          return String(dataValue);
        });
        // 如果替换后包含 __REMOVE_FIELD__，标记整个字段删除
        if (result.includes('__REMOVE_FIELD__')) {
          return '__REMOVE_FIELD__';
        }
        return result;
      }
      
      return value;
    } else if (Array.isArray(value)) {
      return value.map(processValue).filter(item => item !== '__REMOVE_FIELD__');
    } else if (value && typeof value === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        const processed = processValue(v);
        if (processed !== '__REMOVE_FIELD__') {
          result[k] = processed;
        }
      }
      return result;
    }
    
    return value;
  }
  
  return processValue(template);
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
