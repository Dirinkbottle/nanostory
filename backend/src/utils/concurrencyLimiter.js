/**
 * 并发限制器
 * 用于控制同时执行的异步任务数量
 * 
 * 使用场景：
 * - 工作流任务并行执行控制
 * - AI 模型调用并发控制
 * - 批量操作限流
 */

class ConcurrencyLimiter {
  /**
   * @param {number} maxConcurrency - 最大并发数
   */
  constructor(maxConcurrency = 3) {
    if (maxConcurrency < 1) {
      throw new Error('maxConcurrency must be at least 1');
    }
    this.maxConcurrency = maxConcurrency;
    this.running = 0;
    this.queue = [];
  }

  /**
   * 在并发限制下执行函数
   * @param {Function} fn - 要执行的异步函数
   * @returns {Promise<any>} 函数执行结果
   */
  async run(fn) {
    // 如果已达到最大并发数，等待队列
    if (this.running >= this.maxConcurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      // 释放队列中等待的任务
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }

  /**
   * 批量执行任务，返回所有结果
   * @param {Array<Function>} tasks - 任务函数数组
   * @returns {Promise<Array>} 所有结果的数组（保持顺序）
   */
  async runAll(tasks) {
    return Promise.all(tasks.map(task => this.run(task)));
  }

  /**
   * 批量执行任务，返回已完成的结果（包括失败）
   * @param {Array<Function>} tasks - 任务函数数组
   * @returns {Promise<Array<{status: 'fulfilled'|'rejected', value?: any, reason?: any}>>}
   */
  async runAllSettled(tasks) {
    return Promise.allSettled(tasks.map(task => this.run(task)));
  }

  /**
   * 获取当前状态
   * @returns {object}
   */
  getStats() {
    return {
      maxConcurrency: this.maxConcurrency,
      running: this.running,
      queued: this.queue.length
    };
  }

  /**
   * 重置限制器（清空队列，谨慎使用）
   */
  reset() {
    this.running = 0;
    // 拒绝所有等待的任务
    while (this.queue.length > 0) {
      const next = this.queue.shift();
      // 不调用 next()，让它们永远等待（或调用方应处理 timeout）
    }
  }
}

/**
 * 创建带超时的并发限制执行
 * @param {ConcurrencyLimiter} limiter 
 * @param {Function} fn 
 * @param {number} timeoutMs 
 * @returns {Promise<any>}
 */
async function runWithTimeout(limiter, fn, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Task timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    limiter.run(fn)
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

module.exports = ConcurrencyLimiter;
module.exports.runWithTimeout = runWithTimeout;
