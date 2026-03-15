/**
 * 安全 JSON 字段解析工具
 * 
 * 统一处理数据库中既可能是 JSON 字符串也可能是已解析对象的字段，
 * 替代散落在各处的 typeof x === 'string' ? JSON.parse(x) : x 模式。
 */

/**
 * 安全解析 JSON 字段
 * @param {*} value - 待解析的值（可能是 string、object 或 null/undefined）
 * @param {*} [fallback=null] - 解析失败时的回退值
 * @returns {*} 解析后的对象/数组，或 fallback
 */
function parseJsonField(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('[parseJsonField] JSON 解析失败:', err.message, '| 原始值前100字符:', String(value).substring(0, 100));
    return fallback;
  }
}

module.exports = { parseJsonField };
