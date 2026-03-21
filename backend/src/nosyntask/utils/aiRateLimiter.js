/**
 * AI 调用全局限流器（支持按角色动态配置）
 * 
 * 使用信号量模式控制并发数，防止：
 * 1. 多用户同时触发大量 AI 任务导致 API 限流（429 错误）
 * 2. 数据库连接池耗尽
 * 3. 服务器内存/CPU 过载
 * 
 * 配置参数从数据库 rate_limit_configs 表读取，支持按角色配置不同限额
 */

const { queryAll, queryOne } = require('../../dbHelper');

// 默认配置（数据库加载前或加载失败时使用）
const DEFAULT_CONFIG = {
  max_concurrent_text: 10,
  max_concurrent_image: 5,
  max_concurrent_video: 3,
  timeout_seconds: 300,
  retry_delay_ms: 60000,
  max_retries: 3
};

// 缓存的配置（按角色索引）
let configCache = {};
let defaultConfig = { ...DEFAULT_CONFIG };
let configLoaded = false;

/**
 * 简单信号量实现
 */
class Semaphore {
  constructor(maxConcurrent, name = 'unknown') {
    this.maxConcurrent = maxConcurrent;
    this.name = name;
    this.current = 0;
    this.queue = [];
    this.stats = {
      acquired: 0,
      released: 0,
      maxWaitingReached: 0,
      totalWaitTime: 0
    };
  }

  // 动态更新最大并发数
  updateMaxConcurrent(newMax) {
    const oldMax = this.maxConcurrent;
    this.maxConcurrent = newMax;
    console.log(`[RateLimiter] ${this.name} 并发限制更新: ${oldMax} -> ${newMax}`);
    
    // 如果增加了限额，尝试释放等待队列
    while (this.queue.length > 0 && this.current < this.maxConcurrent) {
      const next = this.queue.shift();
      this.current++;
      next.resolve();
    }
  }

  async acquire(timeout = 300000) {
    const startTime = Date.now();
    
    if (this.current < this.maxConcurrent) {
      this.current++;
      this.stats.acquired++;
      return { acquired: true, waitTime: 0 };
    }

    // 需要等待
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = this.queue.findIndex(item => item.resolve === resolve);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
        }
        reject(new Error(`AI 限流等待超时（${timeout / 1000}秒），当前队列长度: ${this.queue.length}`));
      }, timeout);

      this.queue.push({
        resolve: () => {
          clearTimeout(timeoutId);
          const waitTime = Date.now() - startTime;
          this.stats.totalWaitTime += waitTime;
          this.stats.acquired++;
          resolve({ acquired: true, waitTime });
        }
      });

      this.stats.maxWaitingReached = Math.max(this.stats.maxWaitingReached, this.queue.length);
    });
  }

  release() {
    this.current--;
    this.stats.released++;
    
    if (this.queue.length > 0 && this.current < this.maxConcurrent) {
      const next = this.queue.shift();
      this.current++;
      next.resolve();
    }
  }

  getStats() {
    return {
      ...this.stats,
      current: this.current,
      waiting: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      avgWaitTime: this.stats.acquired > 0 ? Math.round(this.stats.totalWaitTime / this.stats.acquired) : 0
    };
  }
}

// 按角色存储信号量实例
const semaphoresByRole = {};

/**
 * 获取或创建角色的信号量组
 */
function getSemaphoresForRole(role) {
  if (!semaphoresByRole[role]) {
    const config = configCache[role] || defaultConfig;
    semaphoresByRole[role] = {
      text: new Semaphore(config.max_concurrent_text, `${role}-text`),
      image: new Semaphore(config.max_concurrent_image, `${role}-image`),
      video: new Semaphore(config.max_concurrent_video, `${role}-video`)
    };
  }
  return semaphoresByRole[role];
}

/**
 * 从数据库加载配置
 */
async function loadConfigsFromDB() {
  try {
    const configs = await queryAll(
      'SELECT * FROM rate_limit_configs WHERE is_active = 1'
    );

    const newCache = {};
    for (const config of configs) {
      if (config.role === 'default') {
        defaultConfig = {
          max_concurrent_text: config.max_concurrent_text || DEFAULT_CONFIG.max_concurrent_text,
          max_concurrent_image: config.max_concurrent_image || DEFAULT_CONFIG.max_concurrent_image,
          max_concurrent_video: config.max_concurrent_video || DEFAULT_CONFIG.max_concurrent_video,
          timeout_seconds: config.timeout_seconds || DEFAULT_CONFIG.timeout_seconds,
          retry_delay_ms: config.retry_delay_ms || DEFAULT_CONFIG.retry_delay_ms,
          max_retries: config.max_retries || DEFAULT_CONFIG.max_retries
        };
      } else {
        newCache[config.role] = {
          max_concurrent_text: config.max_concurrent_text,
          max_concurrent_image: config.max_concurrent_image,
          max_concurrent_video: config.max_concurrent_video,
          timeout_seconds: config.timeout_seconds,
          retry_delay_ms: config.retry_delay_ms,
          max_retries: config.max_retries
        };
      }
    }

    configCache = newCache;
    configLoaded = true;
    console.log(`[RateLimiter] 已从数据库加载 ${configs.length} 个限流配置`);

    // 更新已存在的信号量
    for (const role in semaphoresByRole) {
      const config = configCache[role] || defaultConfig;
      semaphoresByRole[role].text.updateMaxConcurrent(config.max_concurrent_text);
      semaphoresByRole[role].image.updateMaxConcurrent(config.max_concurrent_image);
      semaphoresByRole[role].video.updateMaxConcurrent(config.max_concurrent_video);
    }

    return true;
  } catch (err) {
    // 表可能不存在（迁移未执行），使用默认配置
    console.warn('[RateLimiter] 加载数据库配置失败，使用默认配置:', err.message);
    return false;
  }
}

/**
 * 重新加载配置（供管理员修改后调用）
 */
async function reloadRateLimitConfigs() {
  return loadConfigsFromDB();
}

/**
 * 确保配置已加载
 */
async function ensureConfigLoaded() {
  if (!configLoaded) {
    await loadConfigsFromDB();
  }
}

/**
 * 获取角色的配置
 */
function getConfigForRole(role) {
  return configCache[role] || defaultConfig;
}

/**
 * 根据模型类型获取对应的限流器
 * @param {string} modelName - 模型名称
 * @param {string} userRole - 用户角色
 * @returns {Semaphore}
 */
function getSemaphoreForModel(modelName, userRole = 'default') {
  const name = (modelName || '').toLowerCase();
  const semaphores = getSemaphoresForRole(userRole);
  
  // 视频模型限流最严格
  if (name.includes('video') || name.includes('kling') || name.includes('runway') || name.includes('pika')) {
    return semaphores.video;
  }
  
  // 图片模型次之
  if (name.includes('image') || name.includes('flux') || name.includes('sd') || name.includes('midjourney') || name.includes('dall')) {
    return semaphores.image;
  }
  
  // 其他（文本模型）
  return semaphores.text;
}

/**
 * 带限流的执行包装器
 * @param {string} modelName - 模型名称（用于选择限流器）
 * @param {Function} fn - 要执行的异步函数
 * @param {object} options - 选项
 * @returns {Promise<any>}
 */
async function withRateLimit(modelName, fn, options = {}) {
  await ensureConfigLoaded();
  
  const { 
    timeout, 
    logTag = 'RateLimiter',
    userRole = 'default'
  } = options;
  
  const config = getConfigForRole(userRole);
  const actualTimeout = timeout || (config.timeout_seconds * 1000);
  const semaphore = getSemaphoreForModel(modelName, userRole);
  
  const { waitTime } = await semaphore.acquire(actualTimeout);
  
  if (waitTime > 1000) {
    console.log(`[${logTag}] 限流等待 ${Math.round(waitTime / 1000)}s 后获取到执行槽位 (角色: ${userRole})`);
  }
  
  try {
    return await fn();
  } finally {
    semaphore.release();
  }
}

/**
 * 获取所有限流器的统计信息
 * @returns {object}
 */
function getRateLimitStats() {
  const roleStats = {};
  
  for (const role in semaphoresByRole) {
    roleStats[role] = {
      text: semaphoresByRole[role].text.getStats(),
      image: semaphoresByRole[role].image.getStats(),
      video: semaphoresByRole[role].video.getStats()
    };
  }
  
  return {
    roleStats,
    configCache,
    defaultConfig,
    configLoaded
  };
}

/**
 * 获取角色的重试配置
 */
function getRetryConfig(userRole = 'default') {
  const config = getConfigForRole(userRole);
  return {
    retryDelayMs: config.retry_delay_ms,
    maxRetries: config.max_retries
  };
}

// 启动时尝试加载配置
loadConfigsFromDB().catch(err => {
  console.warn('[RateLimiter] 启动加载配置失败:', err.message);
});

module.exports = {
  withRateLimit,
  getSemaphoreForModel,
  getRateLimitStats,
  reloadRateLimitConfigs,
  getConfigForRole,
  getRetryConfig,
  ensureConfigLoaded
};
