/**
 * buildInput 工厂 — 统一工作流输入字段
 * 
 * 目的：
 *   所有工作流 handler 接收的字段名必须从字段表中选取，
 *   杜绝手写 buildInput 时拼错字段名或同一含义用不同名字的问题。
 * 
 * 字段表定义在 config/workflow_fieldtable.js，此文件只负责编译和运行时逻辑。
 * 
 * 使用方式：
 *   const { createBuildInput } = require('./buildInputFactory');
 * 
 *   buildInput: createBuildInput([
 *     'textModel',        // 从 jobParams.textModel 取值
 *     'imageModel',       // 从 jobParams.imageModel 取值
 *     'style',
 *     { key: 'width', defaultValue: 1024 },
 *     { key: 'height', defaultValue: 576 },
 *     { key: 'content', from: ctx => ctx.previousResults[0]?.content }  // 自定义取值
 *   ])
 */

const FIELD_REGISTRY = require('./config/workflow_fieldtable');

/**
 * 创建 buildInput 函数
 * 
 * @param {Array<string|Object>} fields - 需要的字段列表
 *   - string:  直接从 FIELD_REGISTRY 取定义，如 'textModel'
 *   - object:  自定义配置
 *     - key:          输出字段名（必须在 FIELD_REGISTRY 中注册，除非指定 from 函数）
 *     - from:         覆盖来源（string = jobParams 的 key，function = 自定义取值）
 *     - defaultValue: 覆盖默认值
 * 
 * @returns {Function} (context) => inputParams
 */
function createBuildInput(fields) {
  // 编译期校验：确保所有字段名都在注册表中
  const compiled = fields.map(field => {
    if (typeof field === 'string') {
      if (!FIELD_REGISTRY[field]) {
        throw new Error(`[buildInputFactory] 未注册的字段: "${field}"。请先在 FIELD_REGISTRY 中注册。`);
      }
      return { key: field, ...FIELD_REGISTRY[field] };
    }

    // object 形式
    const { key, from, defaultValue } = field;
    if (!key) {
      throw new Error(`[buildInputFactory] 字段配置缺少 key`);
    }

    const registry = FIELD_REGISTRY[key];

    // 如果 from 是函数，允许不在注册表中
    if (typeof from === 'function') {
      return { key, resolver: from, defaultValue: defaultValue ?? null };
    }

    if (!registry && !from) {
      throw new Error(`[buildInputFactory] 未注册的字段: "${key}"。请先在 FIELD_REGISTRY 中注册，或提供 from。`);
    }

    return {
      key,
      from: from || (registry && registry.from),
      defaultValue: defaultValue !== undefined ? defaultValue : (registry && registry.defaultValue),
      resolver: registry && registry.resolver
    };
  });

  // 返回运行时 buildInput 函数
  return function buildInput(context) {
    const input = {};
    for (const { key, from, defaultValue, resolver } of compiled) {
      if (resolver) {
        input[key] = resolver(context) ?? defaultValue;
      } else {
        input[key] = context.jobParams[from] ?? defaultValue;
      }
    }
    return input;
  };
}

module.exports = {
  createBuildInput,
  FIELD_REGISTRY
};
