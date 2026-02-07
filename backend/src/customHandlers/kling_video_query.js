/**
 * 可灵视频 (Kling) 自定义查询 Handler
 * 
 * 仅处理 JWT 认证，其余参数走模板渲染后的值
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

/**
 * 用 AK/SK 生成可灵 API 的 JWT token
 * @param {string} apiKey - 格式: "access_key+secret_key"（用 '+' 分隔）
 * @returns {string} JWT token
 */
function generateKlingJWT(apiKey) {
  const plusIdx = apiKey.indexOf('+');
  if (plusIdx <= 0 || plusIdx >= apiKey.length - 1) {
    throw new Error('可灵 API Key 格式错误，应为 "AccessKey+SecretKey"（用 + 分隔）');
  }
  const ak = apiKey.substring(0, plusIdx).trim();
  const sk = apiKey.substring(plusIdx + 1).trim();

  console.log(`[Kling Query JWT] AK: ${ak.substring(0, 6)}..., SK length: ${sk.length}`);

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ak,
    exp: now + 1800, // 有效时间 30 分钟
    nbf: now - 300,  // 开始生效时间：当前时间 - 5 分钟（容忍时钟偏差）
    iat: now - 300   // 签发时间也往前调
  };

  const token = jwt.sign(payload, sk, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' }
  });
  return token;
}

module.exports = {
  /**
   * 自定义查询请求
   * @param {object} model - 完整 DB 模型配置
   * @param {object} params - 原始合并参数
   * @param {object} rendered - 模板渲染后的 { url, method, headers, body }
   * @returns {object} 原始 API 响应 data
   */
  async query(model, params, rendered) {
    // 1. 用 AK/SK 生成 JWT 替换认证
    const token = generateKlingJWT(model.api_key);
    // 删除所有大小写变体的 Authorization，避免重复
    for (const key of Object.keys(rendered.headers)) {
      if (key.toLowerCase() === 'authorization') {
        delete rendered.headers[key];
      }
    }
    rendered.headers['Authorization'] = `Bearer ${token}`;
    console.log('[Kling Query Handler] Headers:', JSON.stringify(rendered.headers));

    console.log(`[Kling Query Handler] Query ${rendered.url}`);
    if (rendered.body) {
      console.log('[Kling Query Handler] Body:', JSON.stringify(rendered.body, null, 2));
    }

    const response = await fetch(rendered.url, {
      method: rendered.method || 'GET',
      headers: rendered.headers,
      body: rendered.body ? JSON.stringify(rendered.body) : undefined
    });

    const responseText = await response.text();
    console.log('[Kling Query Handler] Response status:', response.status);
    console.log('[Kling Query Handler] Response body:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // JSON 解析失败，尝试 form-urlencoded
      try {
        const params = new URLSearchParams(responseText);
        data = Object.fromEntries(params.entries());
        console.log('[Kling Query Handler] Parsed as form-urlencoded:', data);
      } catch {
        throw new Error(`Kling API 返回非 JSON 且非 form-urlencoded: ${responseText.substring(0, 300)}`);
      }
    }

    if (!response.ok) {
      throw new Error(data.message || data.msg || JSON.stringify(data) || `Kling API 错误: ${response.status}`);
    }

    return data;
  }
};
