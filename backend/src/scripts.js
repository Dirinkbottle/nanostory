/**
 * Scripts API 路由主文件
 * 
 * 所有端点已拆分到 ./scripts/ 文件夹
 * 在 ./scripts/index.js 中集成
 * 
 * 添加新端点：
 * 1. 在 ./scripts/ 文件夹创建新的端点文件
 * 2. 在 ./scripts/index.js 中导入并注册路由
 */

module.exports = require('./scripts/index');