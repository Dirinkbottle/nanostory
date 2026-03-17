/**
 * 可灵 (Kling) API 共享工具
 * 
 * 提取 kling_video.js 和 kling_video_query.js 共用的 JWT 生成逻辑。
 */

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

  console.log(`[Kling JWT] AK: ${ak.substring(0, 6)}..., SK length: ${sk.length}`);

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

module.exports = { generateKlingJWT };
