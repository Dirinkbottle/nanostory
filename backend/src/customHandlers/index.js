/**
 * 自定义 Handler 注册表
 * 
 * 每个 handler 文件导出一个对象，包含 call 和/或 query 方法：
 * 
 * module.exports = {
 *   // 自定义提交请求（替代模板 fetch 流程）
 *   async call(model, params, rendered) {
 *     // model    = 完整 DB 模型配置（含 api_key 等）
 *     // params   = 原始 submitParams（如 prompt, imageUrl, imageUrls 等）
 *     // rendered = 模板渲染后的请求参数 { url, method, headers, body }
 *     //
 *     // 返回：原始 API 响应 data（外层统一做 response_mapping）
 *   },
 * 
 *   // 自定义查询请求（替代模板 fetch 流程）
 *   async query(model, params, rendered) {
 *     // 同上，返回原始 API 响应 data
 *   }
 * };
 * 
 * 文件名即为 handler 名称，在 ai_model_configs 表的
 * custom_handler / custom_query_handler 字段中引用。
 * 
 * 示例：custom_handler = "kling_video" → 加载 ./kling_video.js
 */

const path = require('path');
const fs = require('fs');

// handler 缓存
const handlerCache = {};

/**
 * 获取自定义 handler
 * @param {string} handlerName - handler 名称（对应文件名，不含 .js）
 * @returns {object|null} handler 对象（含 call/query 方法），不存在则返回 null
 */
function getHandler(handlerName) {
  if (!handlerName) return null;

  // 安全检查：防止路径穿越
  if (handlerName.includes('..') || handlerName.includes('/') || handlerName.includes('\\')) {
    console.error(`[CustomHandler] 非法 handler 名称: ${handlerName}`);
    return null;
  }

  // 缓存命中
  if (handlerCache[handlerName]) {
    return handlerCache[handlerName];
  }

  // 加载 handler 文件
  const handlerPath = path.join(__dirname, `${handlerName}.js`);
  if (!fs.existsSync(handlerPath)) {
    console.error(`[CustomHandler] handler 文件不存在: ${handlerPath}`);
    return null;
  }

  try {
    const handler = require(handlerPath);
    handlerCache[handlerName] = handler;
    console.log(`[CustomHandler] 已加载 handler: ${handlerName}`);
    return handler;
  } catch (err) {
    console.error(`[CustomHandler] 加载 handler "${handlerName}" 失败:`, err.message);
    return null;
  }
}

module.exports = { getHandler };
