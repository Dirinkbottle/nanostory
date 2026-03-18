const path = require('path');
const fs = require('fs');

const handlerCache = {};

function getBillingHandler(handlerName) {
  if (!handlerName) return null;

  if (handlerName.includes('..') || handlerName.includes('/') || handlerName.includes('\\')) {
    console.error(`[BillingHandler] 非法 handler 名称: ${handlerName}`);
    return null;
  }

  if (handlerCache[handlerName]) {
    return handlerCache[handlerName];
  }

  const handlerPath = path.join(__dirname, `${handlerName}.js`);
  if (!fs.existsSync(handlerPath)) {
    console.error(`[BillingHandler] handler 文件不存在: ${handlerPath}`);
    return null;
  }

  try {
    const handler = require(handlerPath);
    handlerCache[handlerName] = handler;
    console.log(`[BillingHandler] 已加载 handler: ${handlerName}`);
    return handler;
  } catch (error) {
    console.error(`[BillingHandler] 加载 handler "${handlerName}" 失败:`, error.message);
    return null;
  }
}

module.exports = {
  getBillingHandler
};
