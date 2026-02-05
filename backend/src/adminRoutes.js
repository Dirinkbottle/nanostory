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
    const engine = require('./nosyntask/engine');
    const userId = req.user.id;

    // 启动 smart_parse 工作流（异步执行）
    const result = await engine.startWorkflow('smart_parse', {
      userId,
      projectId: null, // 管理后台操作，无项目关联
      jobParams: { apiDoc, modelName, customPrompt }
    });

    res.json({ 
      jobId: result.jobId,
      tasks: result.tasks,
      message: '解析任务已启动'
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

/**
 * 模型调试 - 发送测试请求
 * Text 模型：直接返回结果
 * Image/Video/Audio 模型：返回提交结果（含 taskId 等）
 */
router.post('/ai-models/:id/test', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { params } = req.body; // 用户自定义的调用参数

  try {
    const model = await queryOne('SELECT * FROM ai_model_configs WHERE id = ?', [id]);
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }

    const { callAIModel } = require('./aiModelService');
    const startTime = Date.now();
    const result = await callAIModel(model.name, params || {});
    const elapsed = Date.now() - startTime;

    res.json({
      success: true,
      category: model.category,
      elapsed,
      result,
      hasQueryConfig: !!(model.query_url_template)
    });
  } catch (error) {
    console.error('[Admin] Test model error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '调用失败',
      error: error.message
    });
  }
});

/**
 * 模型调试 - 查询异步任务状态（Image/Video 等需要轮询的模型）
 * 前端传入 submitResult：提交接口经 response_mapping 映射后的字段
 * 这些字段自动作为查询模板的占位符参数
 */
router.post('/ai-models/:id/query', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { submitResult } = req.body;

  if (!submitResult || typeof submitResult !== 'object') {
    return res.status(400).json({ message: '缺少 submitResult（提交接口的映射结果）' });
  }

  try {
    const model = await queryOne('SELECT name FROM ai_model_configs WHERE id = ?', [id]);
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }

    const { queryAIModel } = require('./aiModelService');
    // 剥离 _raw/_model，剩余映射字段作为查询参数
    const { _raw, _model, ...mappedFields } = submitResult;
    const result = await queryAIModel(model.name, mappedFields);

    res.json({
      success: true,
      result,
      raw: result._raw || result
    });
  } catch (error) {
    console.error('[Admin] Query model error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '查询失败' 
    });
  }
});

module.exports = router;
