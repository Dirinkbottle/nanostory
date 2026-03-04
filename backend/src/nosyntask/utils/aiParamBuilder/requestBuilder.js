/**
 * 请求构建器
 * 基于模型配置和参数构建完整的 HTTP 请求对象
 */

const {
  renderWithFallback
} = require('../../../utils/templateRenderer');

/**
 * 构建 AI 模型请求对象
 * @param {object} config - 模型配置
 * @param {object} params - 合并后的参数
 * @returns {object} 请求对象 { url, method, headers, body }
 * @throws {Error} 模板渲染失败或缺少必需参数
 */
function buildRequest(config, params) {
  // 使用 renderWithFallback 进行完整的占位符校验和参数派生
  // runtimeParams 传入已合并的参数，fallbackParams 为空（因为已经在外层合并过了）
  const url = renderWithFallback('string', config.urlTemplate, params, {}, 'url');

  const headers = renderWithFallback('json', config.headersTemplate, params, {}, 'headers');

  let body = null;
  if (config.bodyTemplate && (config.requestMethod === 'POST' || config.requestMethod === 'PUT')) {
    body = renderWithFallback('json', config.bodyTemplate, params, {}, 'body');
  }

  return {
    url,
    method: config.requestMethod,
    headers,
    body
  };
}

/**
 * 构建查询请求对象（用于异步任务轮询）
 * @param {object} config - 模型配置
 * @param {object} params - 合并后的参数
 * @returns {object|null} 查询请求对象 { url, method, headers, body } 或 null
 */
function buildQueryRequest(config, params) {
  if (!config.queryUrlTemplate) {
    return null;
  }

  const url = renderWithFallback('string', config.queryUrlTemplate, params, {}, 'query_url');

  const headers = config.queryHeadersTemplate
    ? renderWithFallback('json', config.queryHeadersTemplate, params, {}, 'query_headers')
    : {};

  let body = null;
  const queryMethod = config.queryMethod || 'GET';
  if (config.queryBodyTemplate && queryMethod !== 'GET') {
    body = renderWithFallback('json', config.queryBodyTemplate, params, {}, 'query_body');
  }

  return {
    url,
    method: queryMethod,
    headers,
    body
  };
}

/**
 * 序列化请求体（根据 Content-Type）
 * @param {object} body - 请求体对象
 * @param {object} headers - 请求头
 * @returns {string} 序列化后的请求体
 */
function serializeBody(body, headers) {
  if (!body) return null;

  const contentType = headers['Content-Type'] || headers['content-type'] || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    // URL 编码格式
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value));
    }
    return params.toString();
  }

  // 默认使用 JSON 格式
  return JSON.stringify(body);
}

module.exports = {
  buildRequest,
  buildQueryRequest,
  serializeBody
};
