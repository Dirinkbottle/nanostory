/**
 * 文本模型参数自动派生工具
 * 
 * 从 prompt, message, messages 中任意已有的参数自动派生其余缺失的参数。
 * 
 * 派生规则：
 *   prompt   → message + messages([{role:'user', content: prompt}])
 *   message  → prompt + messages([{role:'user', content: message}])
 *   messages → prompt(=最后一条 user content) + message(=同)
 * 
 * @param {Object} params
 * @param {string}            [params.prompt]   - 提示词字符串
 * @param {string}            [params.message]  - 单条消息字符串
 * @param {Array<{role:string, content:string}>} [params.messages] - 消息数组
 * @returns {{ prompt: string|null, message: string|null, messages: Array|null }}
 */
function deriveTextParams({ prompt, message, messages }) {
  let p = prompt || null;
  let m = message || null;
  let ms = messages && messages.length > 0 ? [...messages] : null;

  // ── 从 prompt 派生 ──
  if (p) {
    if (!m) m = p;
    if (!ms) ms = [{ role: 'user', content: p }];
  }

  // ── 从 message 派生 ──
  if (m) {
    if (!p) p = m;
    if (!ms) ms = [{ role: 'user', content: m }];
  }

  // ── 从 messages 派生 ──
  if (ms && ms.length > 0) {
    // 取最后一条 user 消息的 content 作为 prompt/message
    const lastUser = [...ms].reverse().find(msg => msg.role === 'user');
    const content = lastUser?.content || ms[ms.length - 1]?.content || null;
    if (content) {
      if (!p) p = content;
      if (!m) m = content;
    }
  }

  return { prompt: p, message: m, messages: ms };
}

module.exports = { deriveTextParams };
