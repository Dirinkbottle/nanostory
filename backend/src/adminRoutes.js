const express = require('express');
const { queryOne, queryAll, execute } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

const adminMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '权限不足，仅管理员可访问' });
  }
  next();
};

router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    
    const totalModels = await queryOne('SELECT COUNT(*) as count FROM ai_model_configs');
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRequests = await queryOne(
      'SELECT COUNT(*) as count FROM billing_records WHERE created_at >= ?',
      [todayStart]
    );
    
    const totalScripts = await queryOne('SELECT COUNT(*) as count FROM scripts');
    
    res.json({
      totalUsers: totalUsers?.count || 0,
      totalModels: totalModels?.count || 0,
      todayRequests: todayRequests?.count || 0,
      totalScripts: totalScripts?.count || 0
    });
  } catch (error) {
    console.error('[Admin] Get stats error:', error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await queryAll(
      'SELECT id, email, role, balance, created_at, updated_at FROM users ORDER BY id DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('[Admin] Get users error:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});

router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await queryOne(
      'SELECT id, email, role, balance, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('[Admin] Get user error:', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, role, balance } = req.body;
  
  try {
    const user = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const updates = [];
    const values = [];
    
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined && ['user', 'admin'].includes(role)) {
      updates.push('role = ?');
      values.push(role);
    }
    if (balance !== undefined) {
      updates.push('balance = ?');
      values.push(balance);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: '没有需要更新的字段' });
    }
    
    values.push(id);
    await execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ message: '用户信息已更新' });
  } catch (error) {
    console.error('[Admin] Update user error:', error);
    res.status(500).json({ message: '更新用户信息失败' });
  }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ message: '不能删除自己的账户' });
    }
    
    const user = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    await execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: '用户已删除' });
  } catch (error) {
    console.error('[Admin] Delete user error:', error);
    res.status(500).json({ message: '删除用户失败' });
  }
});

router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { email, password, role, balance } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: '邮箱和密码不能为空' });
  }
  
  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ message: '邮箱已被使用' });
    }
    
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync(password, 10);
    
    await execute(
      'INSERT INTO users (email, password_hash, role, balance) VALUES (?, ?, ?, ?)',
      [email, passwordHash, role || 'user', balance || 100]
    );
    
    res.json({ message: '用户创建成功' });
  } catch (error) {
    console.error('[Admin] Create user error:', error);
    res.status(500).json({ message: '创建用户失败' });
  }
});

router.get('/ai-models', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const models = await queryAll(
      `SELECT id, name, category, provider, description, is_active, api_key,
              price_config, request_method, url_template, headers_template, 
              body_template, default_params, response_mapping,
              query_url_template, query_method, query_headers_template, 
              query_body_template, query_response_mapping,
              created_at, updated_at 
       FROM ai_model_configs ORDER BY id DESC`
    );
    res.json({ models });
  } catch (error) {
    console.error('[Admin] Get AI models error:', error);
    res.status(500).json({ message: '获取模型列表失败' });
  }
});

router.get('/ai-models/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const model = await queryOne(
      `SELECT * FROM ai_model_configs WHERE id = ?`,
      [id]
    );
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }
    
    res.json({ model });
  } catch (error) {
    console.error('[Admin] Get AI model error:', error);
    res.status(500).json({ message: '获取模型信息失败' });
  }
});

router.post('/ai-models', authMiddleware, adminMiddleware, async (req, res) => {
  const {
    name, category, provider, description, is_active, api_key,
    price_config, request_method, url_template, headers_template,
    body_template, default_params, response_mapping,
    query_url_template, query_method, query_headers_template,
    query_body_template, query_response_mapping
  } = req.body;
  
  if (!name || !category || !provider || !price_config || !url_template || !headers_template || !response_mapping) {
    return res.status(400).json({ message: '必填字段不能为空' });
  }
  
  try {
    await execute(
      `INSERT INTO ai_model_configs (
        name, category, provider, description, is_active, api_key,
        price_config, request_method, url_template, headers_template,
        body_template, default_params, response_mapping,
        query_url_template, query_method, query_headers_template,
        query_body_template, query_response_mapping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, category, provider, description, is_active ?? 1, api_key,
        JSON.stringify(price_config), request_method || 'POST', url_template,
        JSON.stringify(headers_template), body_template ? JSON.stringify(body_template) : null,
        default_params ? JSON.stringify(default_params) : null, JSON.stringify(response_mapping),
        query_url_template || null, query_method || 'GET',
        query_headers_template ? JSON.stringify(query_headers_template) : null,
        query_body_template ? JSON.stringify(query_body_template) : null,
        query_response_mapping ? JSON.stringify(query_response_mapping) : null
      ]
    );
    
    res.json({ message: '模型创建成功' });
  } catch (error) {
    console.error('[Admin] Create AI model error:', error);
    res.status(500).json({ message: '创建模型失败' });
  }
});

router.put('/ai-models/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    name, category, provider, description, is_active, api_key,
    price_config, request_method, url_template, headers_template,
    body_template, default_params, response_mapping,
    query_url_template, query_method, query_headers_template,
    query_body_template, query_response_mapping
  } = req.body;
  
  try {
    const model = await queryOne('SELECT id FROM ai_model_configs WHERE id = ?', [id]);
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }
    
    await execute(
      `UPDATE ai_model_configs SET
        name = ?, category = ?, provider = ?, description = ?, is_active = ?, api_key = ?,
        price_config = ?, request_method = ?, url_template = ?, headers_template = ?,
        body_template = ?, default_params = ?, response_mapping = ?,
        query_url_template = ?, query_method = ?, query_headers_template = ?,
        query_body_template = ?, query_response_mapping = ?
      WHERE id = ?`,
      [
        name, category, provider, description, is_active, api_key,
        JSON.stringify(price_config), request_method, url_template,
        JSON.stringify(headers_template), body_template ? JSON.stringify(body_template) : null,
        default_params ? JSON.stringify(default_params) : null, JSON.stringify(response_mapping),
        query_url_template, query_method,
        query_headers_template ? JSON.stringify(query_headers_template) : null,
        query_body_template ? JSON.stringify(query_body_template) : null,
        query_response_mapping ? JSON.stringify(query_response_mapping) : null,
        id
      ]
    );
    
    res.json({ message: '模型更新成功' });
  } catch (error) {
    console.error('[Admin] Update AI model error:', error);
    res.status(500).json({ message: '更新模型失败' });
  }
});

router.delete('/ai-models/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const model = await queryOne('SELECT id FROM ai_model_configs WHERE id = ?', [id]);
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }
    
    await execute('DELETE FROM ai_model_configs WHERE id = ?', [id]);
    res.json({ message: '模型已删除' });
  } catch (error) {
    console.error('[Admin] Delete AI model error:', error);
    res.status(500).json({ message: '删除模型失败' });
  }
});

router.post('/ai-models/smart-parse', authMiddleware, adminMiddleware, async (req, res) => {
  const { apiDoc, modelName, customPrompt } = req.body;
  
  if (!apiDoc || !modelName) {
    return res.status(400).json({ message: 'API文档和模型名称不能为空' });
  }
  
  try {
    const { callAIModel } = require('./aiModelService');
    
    // 使用 One-Shot Learning：通过完美示例教会 AI
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
  - 如果参数在 URL 中：https://api.example.com/chat?key={{apiKey}}&content={{prompt}}
  - 占位符可以带引号或不带引号，系统都能正确处理并自动 URL 编码
  - 如果参数在 Body 中：https://api.example.com/chat
- **request_method** (必填): HTTP 方法，通常是 POST 或 GET
- **headers_template** (必填): HTTP 请求头（JSON 对象），常见格式：
  - {"Content-Type": "application/json", "Authorization": "Bearer {{apiKey}}"}
  - {"Content-Type": "application/x-www-form-urlencoded", "Authorization": "{{apiKey}}"}
- **body_template** (可选): HTTP 请求体（JSON 对象），仅用于 POST/PUT 请求
  - 如果参数在 URL 中，此字段为空对象 {}
  - 如果参数在 Body 中，构造完整的请求体结构

**响应配置字段：**
- **response_mapping** (必填): 响应字段映射（JSON 对象），用于提取 API 返回的关键信息
  - 使用点号表示嵌套路径，如 "data.result.video_url"
  - 数组用数字索引，如 "choices.0.message.content"
  - 常见映射：
    - 文本模型：{"content": "响应内容路径", "tokens": "token数路径"}
    - 异步任务：{"taskId": "任务ID路径"}
    - 同步图片/视频：{"url": "结果URL路径"}

**其他字段：**
- **default_params** (可选): 默认参数（JSON 对象），前端未传时使用
- **price_unit** (必填): 计费单位，如 token、second、image
- **price_value** (必填): 单价（数字），如 0.0001

### ✅ 标准占位符字典（必须使用双大括号格式 {{}} ）

**核心占位符（最常用）：**
- {{apiKey}} - API 鉴权密钥
- {{prompt}} - 用户输入的提示词/内容
- {{model}} - 模型名称

**聊天模型专用：**
- {{messages}} - 消息数组（聊天历史，JSON 格式）
- {{maxTokens}} - 最大 Token 数
- {{temperature}} - 温度参数（0-1）

**图片/视频生成专用：**
- {{imageUrl}} - 参考图片链接
- {{videoUrl}} - 参考视频链接
- {{aspectRatio}} - 宽高比（如 16:9, 9:16）
- {{style}} - 风格/预设（如 realistic, anime）

**异步任务专用：**
- {{taskId}} - 任务ID（用于查询任务状态）
- {{callbackUrl}} - 回调地址

### 📚 学习示例 (Follow this pattern!)

【示例 1：Body 参数方式】
输入文档：
POST https://api.demo.com/v1/video/create
Headers: X-Auth-Token: sk-123456
Body: { "text": "a cat", "ref_img": "http://...", "ratio": "16:9" }
Response: { "code": 200, "data": { "job_id": "888" } }

你的输出：
{
  "name": "Demo Video Model",
  "provider": "demo",
  "category": "VIDEO",
  "description": "视频生成接口",
  "url_template": "https://api.demo.com/v1/video/create",
  "request_method": "POST",
  "headers_template": {
    "Content-Type": "application/json",
    "X-Auth-Token": "{{apiKey}}"
  },
  "body_template": {
    "text": "{{prompt}}",
    "ref_img": "{{imageUrl}}",
    "ratio": "{{aspectRatio}}"
  },
  "response_mapping": {
    "taskId": "data.job_id"
  },
  "default_params": {
    "ratio": "16:9"
  },
  "price_unit": "second",
  "price_value": 0.0001
}

【示例 2：URL 参数方式 - 重要！】
输入文档：
POST https://api.example.com/chat/index
请求参数：key（API密钥）、content（内容）、model（模型名）
Response: 
{
  "code": 200,
  "data": {
    "choices": [
      {
        "message": {
          "content": "这是AI的回复内容"
        }
      }
    ],
    "usage": {
      "total_tokens": 628
    }
  }
}

你的输出（注意 URL 中占位符不要加引号，response_mapping 使用点号和数字索引）：
{
  "name": "Example Chat",
  "provider": "example",
  "category": "TEXT",
  "description": "聊天接口",
  "url_template": "https://api.example.com/chat/index?key={{apiKey}}&content={{prompt}}&model={{model}}",
  "request_method": "POST",
  "headers_template": {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body_template": {},
  "response_mapping": {
    "content": "data.choices.0.message.content",
    "tokens": "data.usage.total_tokens"
  },
  "default_params": {
    "model": "default-model"
  },
  "price_unit": "token",
  "price_value": 0.0001
}

### 🔍 特殊情况处理
1. **URL 参数方式**：如果 API 使用 URL 参数（如 ?key=abc&content=hello），请在 url_template 中使用占位符
   示例: "https://api.example.com/chat?key={{apiKey}}&content={{prompt}}&model={{model}}"
2. **Body 参数方式**：如果是 POST 且参数在 Body 中，放在 body_template
3. **混合方式**：部分在 URL，部分在 Body，请分别配置
4. **response_mapping 路径**：使用点号分隔，数组用数字索引（如 choices.0.message.content）
5. **非标准认证**：如果 API Key 不在 Authorization header 中，而是在 URL 参数或 Body 中，请相应配置`;

    const userMessage = `请分析以下 API 文档，并生成配置 JSON："\n\n${apiDoc} "`;
    
    // 使用 system 和 user 角色分离
    const messages = [
      { role: 'system', content: customPrompt || systemInstruction },
      { role: 'user', content: userMessage }
    ];
    
    const result = await callAIModel(modelName, {
      messages: messages,
      maxTokens: 4000,
      temperature: 0.1  // 降低温度，让输出更准确
    });
    
    console.log('[Debug] ✅ AI 调用成功');
    console.log('[Debug] AI 返回的原始内容:', result.content);
    console.log('[Debug] AI 返回的 tokens:', result.tokens);
    console.log('[Debug] result 对象的所有键:', Object.keys(result));
    
    let parsedConfig;
    try {
      let content = result.content.trim();
      console.log('[Debug] 清洗前的内容长度:', content.length);
      
      // 1. 移除 <think> 标签及其内容（DeepSeek/Gemini 的思考过程）
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      console.log('[Debug] 移除 <think> 标签后长度:', content.length);
      
      // 2. 清洗 markdown 代码块标记
      if (content.includes('```')) {
        console.log('[Debug] 检测到 Markdown 代码块，开始清洗...');
        content = content.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '');
      }
      
      // 3. 提取 JSON 对象
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[Debug] 通过正则提取到 JSON，长度:', jsonMatch[0].length);
        let jsonStr = jsonMatch[0];
        
       
        
        // 4. 先尝试直接解析
        try {
          parsedConfig = JSON.parse(jsonStr);
          console.log('[Debug] ✅ 直接解析成功');
        } catch (firstError) {
          console.log('[Debug] 直接解析失败，尝试清理后再解析:', firstError.message);
          // 清理可能的问题字符，但保留 JSON 结构需要的换行和空格
          jsonStr = jsonStr
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符，保留 \t \n \r
            .replace(/\r\n/g, '\n') // 统一换行符
            .replace(/\r/g, '\n');
          
          console.log('[Debug] 清理后重新解析');
          parsedConfig = JSON.parse(jsonStr);
        }
      } else {
        console.log('[Debug] 直接解析整个内容为 JSON');
        parsedConfig = JSON.parse(content);
      }
      
      console.log('[Debug] ✅ JSON 解析成功');
      console.log('[Debug] 解析后的配置:', JSON.stringify(parsedConfig, null, 2));
    } catch (parseError) {
      console.error('[Debug] ❌ JSON 解析失败:', parseError.message);
      console.error('[Debug] 解析失败的原始内容:', result.content);
      return res.status(400).json({ 
        message: 'AI返回的内容无法解析为JSON',
        rawContent: result.content,
        error: parseError.message
      });
    }
    
    // console.log('[Debug] ✅ 智能解析完成，返回配置');
    // console.log('========== [Smart Parse Debug] 结束 ==========\n');
    
    res.json({ 
      success: true,
      config: parsedConfig,
      tokens: result.tokens
    });
  } catch (error) {
    console.error('[Admin] Smart parse error:', error);
    res.status(500).json({ message: error.message || '智能解析失败' });
  }
});

router.get('/text-models', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { getTextModels } = require('./aiModelService');
    const models = await getTextModels();
    res.json({ models });
  } catch (error) {
    console.error('[Admin] Get text models error:', error);
    res.status(500).json({ message: '获取文本模型列表失败' });
  }
});

module.exports = router;
