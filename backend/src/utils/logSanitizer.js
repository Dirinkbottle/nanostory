/**
 * 日志脱敏工具
 * 
 * 在打印 HTTP headers 等信息前，遮蔽 Authorization、API Key 等敏感字段，
 * 防止 token/密钥泄露到日志中。
 */

const SENSITIVE_KEYS = ['authorization', 'x-api-key', 'api-key', 'cookie', 'set-cookie'];

/**
 * 遮蔽 headers 中的敏感字段
 * @param {object} headers - 原始 headers 对象
 * @returns {object} 脱敏后的新对象（不修改原对象）
 */
function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;

  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase()) && typeof value === 'string') {
      result[key] = value.length > 10 ? value.substring(0, 10) + '***' : '***';
    } else {
      result[key] = value;
    }
  }
  return result;
}

module.exports = { sanitizeHeaders };
