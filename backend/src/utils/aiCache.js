/**
 * AI 响应缓存模块
 * 
 * 用于缓存文本模型（如 DeepSeek）的响应结果
 * 注意：不缓存图片/视频生成结果（每次需要不同结果）
 * 
 * 使用场景：
 * - 相同 prompt 的重复调用（如剧本大纲生成）
 * - 智能解析等确定性文本操作
 */

class AIResponseCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100; // 最多缓存100个结果
    this.ttl = options.ttl || 30 * 60 * 1000; // 30分钟过期
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * 生成缓存 key（对 prompt 和参数进行 hash）
   * @param {string} modelName - 模型名称
   * @param {string} prompt - 提示词
   * @param {object} params - 其他参数（如 temperature, maxTokens）
   * @returns {string} 缓存 key
   */
  generateKey(modelName, prompt, params = {}) {
    // 只包含影响输出的关键参数
    const relevantParams = {
      temperature: params.temperature,
      maxTokens: params.maxTokens || params.max_tokens
    };
    const input = JSON.stringify({ modelName, prompt, ...relevantParams });
    
    // 简单 hash 算法（djb2）
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; // hash * 33 + char
      hash = hash & hash; // 转为 32 位整数
    }
    return `ai_${hash >>> 0}`; // 转为无符号整数
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存 key
   * @returns {any|null} 缓存的值，过期或不存在返回 null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存 key
   * @param {any} value - 要缓存的值
   * @param {number} customTtl - 自定义过期时间（毫秒）
   */
  set(key, value, customTtl = null) {
    // LRU 策略：如果超过最大缓存数，删除最早的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + (customTtl || this.ttl),
      createdAt: Date.now()
    });
    this.stats.sets++;
  }

  /**
   * 检查缓存是否存在且有效
   * @param {string} key - 缓存 key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存 key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    console.log('[AICache] Cache cleared');
  }

  /**
   * 清理过期缓存
   * @returns {number} 清理的条目数
   */
  prune() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) {
      console.log(`[AICache] Pruned ${pruned} expired entries`);
    }
    return pruned;
  }

  /**
   * 获取缓存统计信息
   * @returns {object}
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ...this.stats,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * 判断模型类别是否可缓存
   * 只有文本模型的响应是确定性的，可以缓存
   * @param {string} category - 模型类别（TEXT, IMAGE, VIDEO, AUDIO）
   * @returns {boolean}
   */
  static isCacheable(category) {
    return category === 'TEXT';
  }
}

// 单例导出
const cache = new AIResponseCache();

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  cache.prune();
}, 5 * 60 * 1000);

module.exports = cache;
module.exports.AIResponseCache = AIResponseCache;
