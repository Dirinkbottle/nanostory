/**
 * ETag 工具模块
 * 用于 HTTP 缓存优化（If-None-Match / 304 Not Modified）
 * 
 * 使用场景：
 * - 工作流状态轮询（高频）
 * - 资源列表查询
 */

const crypto = require('crypto');

/**
 * 生成 ETag
 * 基于数据内容生成唯一标识
 * @param {any} data - 要生成 ETag 的数据
 * @returns {string} ETag 值（带引号）
 */
function generateETag(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
  return `"${hash}"`;
}

/**
 * 生成弱 ETag（基于状态变化而非完整内容）
 * 适用于不需要精确内容匹配的场景
 * @param {string} status - 状态值
 * @param {string|Date} updatedAt - 更新时间
 * @returns {string} 弱 ETag 值
 */
function generateWeakETag(status, updatedAt) {
  const timestamp = updatedAt instanceof Date 
    ? updatedAt.getTime() 
    : new Date(updatedAt).getTime();
  return `W/"${status}-${timestamp}"`;
}

/**
 * 检查 ETag 是否匹配（用于 If-None-Match）
 * @param {string} clientETag - 客户端传来的 ETag（If-None-Match 头）
 * @param {string} serverETag - 服务端生成的 ETag
 * @returns {boolean} 是否匹配
 */
function matchesETag(clientETag, serverETag) {
  if (!clientETag || !serverETag) return false;
  
  // 处理 * 通配符
  if (clientETag === '*') return true;
  
  // 规范化比较（去除 W/ 前缀和引号）
  const normalize = (etag) => {
    if (!etag) return '';
    return etag.replace(/^W\//, '').replace(/"/g, '');
  };
  
  // 支持多个 ETag 值（逗号分隔）
  const clientTags = clientETag.split(',').map(t => normalize(t.trim()));
  const serverTag = normalize(serverETag);
  
  return clientTags.includes(serverTag);
}

/**
 * Express 中间件：处理条件请求
 * 自动处理 If-None-Match 并返回 304
 * 
 * @param {Function} getETag - 获取 ETag 的函数，接收 (req, data) 返回 ETag 字符串
 * @returns {Function} Express 中间件
 */
function conditionalGet(getETag) {
  return (req, res, next) => {
    // 保存原始 json 方法
    const originalJson = res.json.bind(res);
    
    // 重写 json 方法
    res.json = function(data) {
      // 生成 ETag
      const etag = typeof getETag === 'function' 
        ? getETag(req, data) 
        : generateETag(data);
      
      // 设置 ETag 头
      res.set('ETag', etag);
      res.set('Cache-Control', 'private, must-revalidate');
      
      // 检查 If-None-Match
      const ifNoneMatch = req.get('If-None-Match');
      if (ifNoneMatch && matchesETag(ifNoneMatch, etag)) {
        return res.status(304).end();
      }
      
      // 正常返回
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * 为工作流状态生成 ETag
 * 基于状态和更新时间的弱 ETag
 * @param {object} job - 工作流对象
 * @returns {string} ETag 值
 */
function generateWorkflowETag(job) {
  if (!job) return null;
  
  // 使用状态 + 更新时间 + 任务进度作为 ETag 依据
  const taskProgress = job.tasks 
    ? job.tasks.map(t => `${t.id}:${t.status}:${t.progress || 0}`).join('|')
    : '';
  
  const content = `${job.status}|${job.updated_at || job.updatedAt}|${taskProgress}`;
  return generateETag(content);
}

module.exports = {
  generateETag,
  generateWeakETag,
  matchesETag,
  conditionalGet,
  generateWorkflowETag
};
