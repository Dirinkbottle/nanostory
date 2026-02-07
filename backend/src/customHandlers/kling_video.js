/**
 * 可灵视频 (Kling) 自定义 Handler
 * 
 * 可灵 API 的特殊之处：
 * 1. 认证方式：需要用 AK/SK 生成 JWT token，不能直接用 API Key 作为 Bearer token
 *    api_key 字段格式：Access Key + Secret Key，用 '+' 分隔，如 "ak_xxx+sk_xxx"
 * 2. 图片参数：首帧(image)和尾帧(image_tail)是分开的字段，不是数组
 *    imageUrls[0] → image（首帧，必须），imageUrls[1] → image_tail（尾帧，可选）
 * 3. 只需自定义 call（提交），query（查询轮询）走模板流程即可
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

module.exports = {
  /**
   * 自定义提交请求
   * @param {object} model - 完整 DB 模型配置
   * @param {object} params - 原始合并参数（含 apiKey, prompt, imageUrl, imageUrls, duration 等）
   * @param {object} rendered - 模板渲染后的 { url, method, headers, body }
   * @returns {object} 原始 API 响应 data
   */
  async call(model, params, rendered) {
    // 1. 用 AK/SK 生成 JWT 替换认证
    const token = generateKlingJWT(model.api_key);
    // 删除所有大小写变体的 Authorization，避免重复
    for (const key of Object.keys(rendered.headers)) {
      if (key.toLowerCase() === 'authorization') {
        delete rendered.headers[key];
      }
    }
    rendered.headers['Authorization'] = `Bearer ${token}`;
    console.log('[Kling Handler] Headers:', JSON.stringify(rendered.headers));

    // 2. 处理图片参数：imageUrls 拆分为首帧和尾帧
    //    imageUrls[0] → image（首帧，必须）
    //    imageUrls[1] → image_tail（尾帧，可选）
    const imageUrls = params.imageUrls || [];
    if (imageUrls.length > 0) {
      rendered.body.image = imageUrls[0];
    }
    if (imageUrls.length > 1) {
      rendered.body.image_tail = imageUrls[1];
    }
    // 兼容：如果只传了 imageUrl（单张），作为首帧
    if (!rendered.body.image && params.imageUrl) {
      rendered.body.image = params.imageUrl;
    }
    // 删除模板可能渲染出的无效字段
    delete rendered.body.imageUrl;
    delete rendered.body.imageUrls;
    delete rendered.body.image_urls;
    // 处理 duration,防止传入无效值
    if(rendered.body.duration != 5 && rendered.body.duration != 10){
       rendered.body.duration = 5;
    }

    console.log(`[Kling Handler] Call ${rendered.url}`);
    console.log('[Kling Handler] Body:', JSON.stringify(rendered.body, null, 2));

    const response = await fetch(rendered.url, {
      method: rendered.method || 'POST',
      headers: rendered.headers,
      body: JSON.stringify(rendered.body)
    });

    const responseText = await response.text();
    console.log('[Kling Handler] Response status:', response.status);
    console.log('[Kling Handler] Response body:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // JSON 解析失败，尝试 form-urlencoded
      try {
        const params = new URLSearchParams(responseText);
        data = Object.fromEntries(params.entries());
        console.log('[Kling Handler] Parsed as form-urlencoded:', data);
      } catch {
        throw new Error(`Kling API 返回非 JSON 且非 form-urlencoded: ${responseText.substring(0, 300)}`);
      }
    }

    if (!response.ok) {
      throw new Error(data.message || data.msg || JSON.stringify(data) || `Kling API 错误: ${response.status}`);
    }

    return data;
  }

  // query 不需要自定义，走模板流程即可
  // 管理后台只需设置 custom_handler = "kling_video"，custom_query_handler 留空
};
