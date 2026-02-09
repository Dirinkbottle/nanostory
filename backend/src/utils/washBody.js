/**
 * AI 响应内容清洗工具
 * 
 * 统一处理 AI 模型返回内容中的各种干扰：
 * - <think>...</think> 思考标签
 * - ```json ... ``` Markdown 代码块
 * - 前后空白、BOM、不可见字符
 * - JSON 提取与安全解析
 * 
 * 用法：
 *   const { stripThinkTags, extractCodeBlock, extractJSON, safeParseJSON, washForJSON } = require('../utils/washBody');
 *   
 *   // 一步到位：清洗 + 解析 JSON
 *   const obj = washForJSON(aiContent);
 *   
 *   // 或分步使用
 *   let text = stripThinkTags(aiContent);
 *   text = extractCodeBlock(text);
 *   const obj = safeParseJSON(text);
 */

/**
 * 移除 <think>...</think> 标签及其内容（支持嵌套、多段）
 */
function stripThinkTags(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * 提取 Markdown 代码块内容
 * 支持 ```json ... ```、``` ... ```、```js ... ``` 等
 * 如果没有代码块，返回原文
 */
function extractCodeBlock(text) {
  if (!text || typeof text !== 'string') return '';
  const match = text.match(/```(?:\w*)\s*\n?([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

/**
 * 从文本中提取第一个 JSON 对象 {...} 或数组 [...]
 * 返回提取到的 JSON 字符串，未找到则返回 null
 */
function extractJSON(text) {
  if (!text || typeof text !== 'string') return null;

  // 尝试匹配 {...} 或 [...]
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);

  if (!objMatch && !arrMatch) return null;

  // 如果两者都匹配到，取出现位置更靠前的那个
  if (objMatch && arrMatch) {
    return objMatch.index <= arrMatch.index ? objMatch[0] : arrMatch[0];
  }
  return (objMatch || arrMatch)[0];
}

/**
 * 清理不可见字符（保留换行和空格）
 */
function stripInvisible(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, ''); // BOM
}

/**
 * 安全解析 JSON 字符串
 * 先直接解析，失败后清理不可见字符再试一次
 * 解析失败返回 null
 */
function safeParseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (!cleaned) return null;

  // 第一次：直接解析
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // 忽略
  }

  // 第二次：清理不可见字符后重试
  try {
    return JSON.parse(stripInvisible(cleaned));
  } catch (_) {
    // 忽略
  }

  return null;
}

/**
 * 一步到位：清洗 AI 响应 → 解析为 JSON 对象/数组
 * 
 * 流程：stripThinkTags → extractCodeBlock → extractJSON → safeParseJSON
 * 
 * @param {string} raw - AI 原始响应文本
 * @returns {object|array|null} 解析后的 JSON，失败返回 null
 */
function washForJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let text = stripThinkTags(raw);
  text = extractCodeBlock(text);

  // 先尝试整体解析
  const direct = safeParseJSON(text);
  if (direct !== null) return direct;

  // 整体失败 → 提取 JSON 片段再解析
  const jsonStr = extractJSON(text);
  if (!jsonStr) return null;

  return safeParseJSON(jsonStr);
}

/**
 * 清洗 AI 响应为纯文本（去 think 标签 + 去代码块标记）
 * 适用于不需要 JSON 解析的场景（如提示词生成）
 * 
 * @param {string} raw - AI 原始响应文本
 * @returns {string} 清洗后的纯文本
 */
function washForText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = stripThinkTags(raw);
  text = extractCodeBlock(text);
  return text.trim();
}

module.exports = {
  stripThinkTags,
  extractCodeBlock,
  extractJSON,
  stripInvisible,
  safeParseJSON,
  washForJSON,
  washForText
};
