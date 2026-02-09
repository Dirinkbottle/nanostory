/**
 * DeepSeek 自定义 Handler
 * 
 * 核心功能：根据 think 标志自动注入 thinking 模式参数
 * 
 * 当 params.think === true 时：
 *   1. 注入 thinking: { type: "enabled" }
 *   2. 移除不兼容参数（temperature, top_p, presence_penalty, frequency_penalty）
 *   3. 提升 max_tokens 上限（thinking 输出包含 CoT，需要更大空间）
 * 
 * 当 think 为 false/未传时：原样转发模板渲染后的请求
 * 
 * 数据库配置：ai_model_configs 表中 custom_handler = "deepseek"
 */

const fetch = require('node-fetch');

module.exports = {
  /**
   * 自定义提交请求
   * @param {object} model - 完整 DB 模型配置
   * @param {object} params - 原始合并参数（含 think, maxTokens 等）
   * @param {object} rendered - 模板渲染后的 { url, method, headers, body }
   * @returns {object} 原始 API 响应 data
   */
  async call(model, params, rendered) {
    const body = rendered.body || {};

    // think 标志：注入 thinking 模式
    if (params.think === true || params.think === 'true') {
      body.thinking = { type: 'enabled' };
      console.log('[DeepSeek Handler] Thinking 模式已启用, max_tokens:', body.max_tokens);
    }

    console.log(`[DeepSeek Handler] Call ${rendered.url}`);
    console.log('[DeepSeek Handler] Body 字段:', Object.keys(body).join(', '));

    // 发送请求（超时 600 秒）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200000);

    try {
      const response = await fetch(rendered.url, {
        method: rendered.method || 'POST',
        headers: rendered.headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const responseText = await response.text();
      console.log('[DeepSeek Handler] Response status:', response.status);
      console.log('[DeepSeek Handler] Response preview:', responseText.substring(0, 300));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`DeepSeek API 返回非 JSON: ${responseText.substring(0, 300)}`);
      }

      if (!response.ok) {
        const errMsg = data.error?.message || data.message || JSON.stringify(data);
        throw new Error(`DeepSeek API 错误 (${response.status}): ${errMsg}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('DeepSeek API 请求超时（600秒）');
      }
      throw err;
    }
  }
};
