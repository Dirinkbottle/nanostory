-- 添加 grok-4.1-fast 文本模型配置
-- xAI (Grok) 使用 OpenAI 兼容的 API 格式
-- 需要设置环境变量 XAI_API_KEY

INSERT INTO ai_model_configs (
  name,
  category,
  provider,
  description,
  is_active,
  api_key,
  price_config,
  request_method,
  url_template,
  headers_template,
  body_template,
  default_params,
  response_mapping
) VALUES (
  'grok-4.1-fast',
  'TEXT',
  'xai',
  'X AI grok-4.1-fast 高速推理模型，兼容 OpenAI API 格式',
  1,
  NULL,
  '{"unit": "token", "price": 0.000003}',
  'POST',
  'https://api.x.ai/v1/chat/completions',
  '{"Content-Type": "application/json", "Authorization": "Bearer {{apiKey}}"}',
  '{"model": "grok-4.1-fast", "messages": {{messages}}, "max_tokens": {{maxTokens}}, "temperature": {{temperature}}}',
  '{"maxTokens": 8192, "temperature": 0.7}',
  '{"content": "choices.0.message.content", "tokens": "usage.total_tokens", "finishReason": "choices.0.finish_reason"}'
)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  url_template = VALUES(url_template),
  headers_template = VALUES(headers_template),
  body_template = VALUES(body_template),
  default_params = VALUES(default_params),
  response_mapping = VALUES(response_mapping);
