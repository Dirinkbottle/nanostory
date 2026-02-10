/**
 * 生成流程追踪系统（基于 AsyncLocalStorage）
 * 
 * 引擎层自动启用，业务代码中用 traced() 包裹函数即可自动记录。
 * 
 * 用法（业务代码）：
 *   const { traced } = require('../engine/generationTrace');
 *   const myFunc = traced('步骤名', _myFunc);
 * 
 * 也可手动记录：
 *   const { trace } = require('../engine/generationTrace');
 *   trace('自定义步骤', { key: value });
 * 
 * 引擎层自动调用 runWithTrace / getTraceResult，业务代码无需关心。
 */

const { AsyncLocalStorage } = require('async_hooks');

const traceStorage = new AsyncLocalStorage();

class GenerationTrace {
  constructor(taskId, taskType) {
    this.taskId = taskId;
    this.taskType = taskType;
    this.steps = [];
    this.startTime = Date.now();
  }

  /**
   * 记录一个步骤
   */
  addStep(name, data = {}) {
    const elapsed = Date.now() - this.startTime;
    const entry = { seq: this.steps.length + 1, elapsed, name };

    // 将 data 中每个值截断为可读的摘要
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null) continue;
      entry[k] = summarizeValue(v);
    }

    this.steps.push(entry);

    // 实时输出
    const ts = `+${(elapsed / 1000).toFixed(1)}s`;
    const dataStr = Object.keys(data).length > 0
      ? ' | ' + Object.entries(data).map(([k, v]) => `${k}=${summarizeForLog(v)}`).join(', ')
      : '';
    console.log(`\x1b[36m🔵 [Trace:${this.taskType} #${this.taskId}] ${entry.seq}/${ts} ${name}${dataStr}\x1b[0m`);
  }

  /**
   * 捕获 console 输出作为日志条目（由 runWithTrace 的 console 拦截器调用）
   */
  captureLog(level, message) {
    if (!message || message.length === 0) return;
    const elapsed = Date.now() - this.startTime;
    this.steps.push({
      seq: this.steps.length + 1,
      elapsed,
      name: `[console.${level}]`,
      message: message.length > 500 ? message.substring(0, 500) + '...' : message
    });
  }

  /**
   * 导出追踪结果
   */
  toJSON() {
    return {
      taskId: this.taskId,
      taskType: this.taskType,
      totalSteps: this.steps.length,
      totalTime: Date.now() - this.startTime,
      steps: this.steps
    };
  }

  /**
   * 输出完成摘要
   */
  logSummary(status, extra = '') {
    const total = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const icon = status === 'completed' ? '✅' : '❌';
    const extraStr = extra ? ` | ${extra}` : '';
    console.log(`\x1b[36m${icon} [Trace:${this.taskType} #${this.taskId}] ${status} | 共${this.steps.length}步 | 耗时${total}s${extraStr}\x1b[0m`);
  }
}

/**
 * 在追踪上下文中执行函数（引擎层调用）
 */
function runWithTrace(taskId, taskType, fn) {
  const traceCtx = new GenerationTrace(taskId, taskType);
  return traceStorage.run(traceCtx, async () => {
    // 拦截 console，自动将日志捕获到 trace（同时保留原始输出）
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    const captureConsole = (level, origFn) => (...args) => {
      origFn.apply(console, args);
      // 跳过 trace 系统自身的输出（避免无限递归）
      const firstArg = typeof args[0] === 'string' ? args[0] : '';
      if (firstArg.includes('[Trace:') || firstArg.includes('🔵') || firstArg.includes('✅') || firstArg.includes('❌')) return;
      const msg = args.map(a => typeof a === 'string' ? a : (a instanceof Error ? a.message : JSON.stringify(a))).join(' ');
      traceCtx.captureLog(level, msg);
    };

    console.log = captureConsole('log', origLog);
    console.warn = captureConsole('warn', origWarn);
    console.error = captureConsole('error', origError);

    try {
      traceCtx.addStep('任务开始');
      const result = await fn();
      traceCtx.addStep('任务完成');
      traceCtx.logSummary('completed');
      return { result, trace: traceCtx.toJSON() };
    } catch (e) {
      traceCtx.addStep('任务失败', { error: e.message });
      traceCtx.logSummary('failed', `error=${e.message}`);
      e._trace = traceCtx.toJSON();
      throw e;
    } finally {
      // 恢复原始 console
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    }
  });
}

/**
 * 获取当前追踪上下文的结果（引擎层调用，用于保存到 DB）
 */
function getTraceResult() {
  const ctx = traceStorage.getStore();
  return ctx ? ctx.toJSON() : null;
}

/**
 * 手动记录一个追踪步骤（业务代码可选使用）
 */
function trace(name, data = {}) {
  const ctx = traceStorage.getStore();
  if (ctx) ctx.addStep(name, data);
}

/**
 * 包裹函数，自动记录输入摘要和输出摘要（业务代码推荐方式）
 * 
 * 用法：const fn = traced('步骤名', originalFn, { extractInput, extractOutput })
 * - extractInput(args): 从参数中提取要记录的信息，默认不记录（避免泄露大对象）
 * - extractOutput(result): 从返回值中提取要记录的信息，默认记录 Object.keys
 */
function traced(name, fn, options = {}) {
  const { extractInput, extractOutput } = options;
  return async function (...args) {
    const ctx = traceStorage.getStore();
    if (!ctx) {
      // 没有追踪上下文，直接执行原函数
      return fn.apply(this, args);
    }

    const inputData = extractInput ? extractInput(...args) : {};
    ctx.addStep(`\x1b[36m${name} 开始\x1b[0m`, inputData);

    const stepStart = Date.now();
    try {
      const result = await fn.apply(this, args);
      const elapsed = Date.now() - stepStart;
      const outputData = extractOutput ? extractOutput(result) : { resultKeys: result ? Object.keys(result) : [] };
      ctx.addStep(`\x1b[36m${name} 完成\x1b[0m`, { ...outputData, elapsed: `${elapsed}ms` });
      return result;
    } catch (e) {
      const elapsed = Date.now() - stepStart;
      ctx.addStep(`\x1b[36m${name} 失败\x1b[0m`, { error: e.message, elapsed: `${elapsed}ms` });
      throw e;
    }
  };
}

// ---- 工具函数 ----

function summarizeValue(v) {
  if (typeof v === 'string') {
    return v.length > 200 ? v.substring(0, 200) + '...' : v;
  }
  if (Array.isArray(v)) {
    if (v.length <= 5) return v.map(item => summarizeValue(item));
    return `[${v.length} items] ${JSON.stringify(v.slice(0, 3)).substring(0, 150)}...`;
  }
  if (typeof v === 'object' && v !== null) {
    const str = JSON.stringify(v);
    return str.length > 300 ? str.substring(0, 300) + '...' : v;
  }
  return v;
}

function summarizeForLog(v) {
  if (typeof v === 'string') {
    return v.length > 80 ? `"${v.substring(0, 80)}..."` : `"${v}"`;
  }
  if (Array.isArray(v)) {
    return `[${v.length} items]`;
  }
  if (typeof v === 'object' && v !== null) {
    return `{${Object.keys(v).join(',')}}`;
  }
  return String(v);
}

module.exports = { runWithTrace, getTraceResult, trace, traced };
