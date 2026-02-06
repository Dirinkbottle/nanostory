/**
 * 智能解析 API 文档处理器
 * input:  { apiDoc, modelName, customPrompt }
 * output: { config (parsed JSON), tokens, rawContent }
 */

const { callAIModel } = require('../../aiModelService');

async function handleSmartParse(inputParams, onProgress) {
  const { apiDoc, modelName, customPrompt } = inputParams;
  const selectedModel = modelName || 'DeepSeek Chat';

  const systemInstruction = `你是一位精通各类 AI 接口的架构师。你的任务是将用户提供的非结构化 API 文档转换为我们系统可执行的标准 JSON 配置。

⚠️ **关键要求：你的回复必须是且只能是一个合法的 JSON 对象，不要包含任何其他文字、解释、思考过程或 Markdown 标记。直接输出 JSON，从 { 开始，到 } 结束。**

### 🎯 为什么需要占位符？
我们的系统是一个统一的 AI 网关，需要动态调用不同厂商的 API。占位符（如 {{apiKey}}）的作用是：
1. **运行时替换**：系统会在实际调用时，将 {{apiKey}} 替换为真实的密钥
2. **安全性**：避免在配置中硬编码敏感信息
3. **灵活性**：同一个配置可以被不同用户、不同场景复用

### 🚫 严禁事项（违反将导致配置无法使用）
1. **只输出纯 JSON**：不要输出任何解释性文字、Markdown 标记（如 \`\`\`json）、思考过程。
2. **严格遵守字段名**：只能使用下方"目标数据结构说明"中列出的字段名，不要自创字段。
3. **绝对不要硬编码密钥**：
   - ❌ 错误："Authorization": "sk-d50bdbcebe58fe22601d4cas"
   - ✅ 正确："Authorization": "{{apiKey}}"
   - 即使文档中有示例密钥，也必须替换为 {{apiKey}} 占位符
4. **URL 占位符不加引号**：
   - ❌ 错误：?key="{{apiKey}}"&content="{{prompt}}"
   - ✅ 正确：?key={{apiKey}}&content={{prompt}}
5. **不要添加 JSON 注释**：标准 JSON 不支持 // 注释，不要添加任何注释。

### 📋 数据库字段详解（ai_model_configs 表）

**基础信息字段：**
- **name** (必填): 模型显示名称，如 "GPT-4o"、"Kling Video"，用于前端展示
- **category** (必填): 模型分类，必须是 TEXT | IMAGE | VIDEO | AUDIO 之一
- **provider** (必填): 厂商标识（英文小写），如 openai、google、kling、wuyinkeji
- **description** (可选): 模型简短描述，帮助用户理解模型功能

**请求配置字段：**
- **url_template** (必填): API 请求地址，可包含占位符如 {{apiKey}}、{{model}}
- **request_method** (必填): HTTP 方法，通常是 POST 或 GET
- **headers_template** (必填): HTTP 请求头（JSON 对象）
- **body_template** (可选): HTTP 请求体（JSON 对象），仅用于 POST/PUT 请求

**响应配置字段：**
- **response_mapping** (必填): 响应字段映射（JSON 对象），使用点号表示嵌套路径

**其他字段：**
- **default_params** (可选): 默认参数（JSON 对象）
- **price_unit** (必填): 计费单位，如 token、second、image
- **price_value** (必填): 单价（数字）

### ✅ 标准占位符字典
- {{apiKey}} - API 鉴权密钥
- {{prompt}} - 用户输入的提示词/内容
- {{model}} - 模型名称
- {{messages}} - 消息数组
- {{maxTokens}} - 最大 Token 数
- {{temperature}} - 温度参数
- {{imageUrl}} - 参考图片链接
- {{videoUrl}} - 参考视频链接
- {{aspectRatio}} - 宽高比
- {{style}} - 风格/预设
- {{taskId}} - 任务ID
- {{callbackUrl}} - 回调地址

### 📚 学习示例

【示例 1：Body 参数方式】
输入：POST https://api.demo.com/v1/video/create, Headers: X-Auth-Token: sk-123456, Body: { "text": "a cat", "ref_img": "http://...", "ratio": "16:9" }, Response: { "code": 200, "data": { "job_id": "888" } }
输出：
{
  "name": "Demo Video Model", "provider": "demo", "category": "VIDEO", "description": "视频生成接口",
  "url_template": "https://api.demo.com/v1/video/create", "request_method": "POST",
  "headers_template": {"Content-Type": "application/json", "X-Auth-Token": "{{apiKey}}"},
  "body_template": {"text": "{{prompt}}", "ref_img": "{{imageUrl}}", "ratio": "{{aspectRatio}}"},
  "response_mapping": {"taskId": "data.job_id"},
  "default_params": {"ratio": "16:9"}, "price_unit": "second", "price_value": 0.0001
}

【示例 2：URL 参数方式】
输入：POST https://api.example.com/chat/index, 参数：key、content、model
输出：
{
  "name": "Example Chat", "provider": "example", "category": "TEXT", "description": "聊天接口",
  "url_template": "https://api.example.com/chat/index?key={{apiKey}}&content={{prompt}}&model={{model}}",
  "request_method": "POST", "headers_template": {"Content-Type": "application/x-www-form-urlencoded"},
  "body_template": {}, "response_mapping": {"content": "data.choices.0.message.content", "tokens": "data.usage.total_tokens"},
  "default_params": {"model": "default-model"}, "price_unit": "token", "price_value": 0.0001
}`;

  const userMessage = `请分析以下 API 文档，并生成配置 JSON："\n\n${apiDoc} "`;

  if (onProgress) onProgress(20);

  const result = await callAIModel(selectedModel, {
    messages: [
      { role: 'system', content: customPrompt || systemInstruction },
      { role: 'user', content: userMessage }
    ],
    maxTokens: 4000,
    temperature: 0.1
  });

  if (onProgress) onProgress(80);

  // 解析 JSON
  let parsedConfig;
  let content = result.content.trim();

  // 移除 <think> 标签
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '');

  // 清洗 markdown 代码块
  if (content.includes('```')) {
    content = content.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '');
  }

  // 提取 JSON 对象
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let jsonStr = jsonMatch[0];
    try {
      parsedConfig = JSON.parse(jsonStr);
    } catch (firstError) {
      jsonStr = jsonStr
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
      parsedConfig = JSON.parse(jsonStr);
    }
  } else {
    parsedConfig = JSON.parse(content);
  }

  if (onProgress) onProgress(95);

  return {
    config: parsedConfig,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown',
    rawContent: result.content
  };
}

module.exports = handleSmartParse;
