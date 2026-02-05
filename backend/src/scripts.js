const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { callAIModel, getTextModels } = require('./aiModelService');

const router = express.Router();

// 获取所有可用的文本模型
router.get('/models', async (req, res) => {
  try {
    const models = await getTextModels();
    res.json({ models });
  } catch (error) {
    console.error('[Get Text Models]', error);
    res.status(500).json({ message: '获取模型列表失败' });
  }
});

// 使用统一 AI 模型服务调用 DeepSeek
async function callDeepSeek({ title, description, style, length }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.warn('[DeepSeek] API key not set, using placeholder');
    return generatePlaceholderScript({ title, description, style, length });
  }

  try {
    const prompt = `请根据以下信息创作一个${length}的${style}风格视频剧本：
标题：${title}
描述：${description}

要求：
1. 分成多个场景，每个场景独立完整
2. 每个场景包含画面描述和对白
3. 适合视频化呈现`;

    const result = await callAIModel('DeepSeek Chat', {
      messages: [
        { role: 'system', content: '你是一个专业的视频剧本创作助手' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 4000,
      temperature: 0.7
    }, apiKey);

    return {
      content: result.content,
      tokens: result.tokens,
      provider: result._model.provider
    };
  } catch (error) {
    console.error('[DeepSeek] API Error:', error);
    return generatePlaceholderScript({ title, description, style, length });
  }
}

// 占位剧本生成器
function generatePlaceholderScript({ title, description, style, length }) {
  const safeTitle = title || '未命名剧本';
  const safeDesc = description || '一个关于创意视频的故事';
  const safeStyle = style || '通用风格';
  const safeLength = length || '短篇';

  const content = [
    `# ${safeTitle}`,
    ``,
    `**风格**：${safeStyle}`,
    `**长度**：${safeLength}`,
    ``,
    `## 故事概要`,
    safeDesc,
    ``,
    `## 第一场景`,
    `【画面】清晨的城市，阳光透过云层洒在街道上`,
    `【对白】"新的一天开始了..."`,
    ``,
    `## 第二场景`,
    `【画面】主角走在街道上，思考着什么`,
    `【对白】内心独白`,
    ``,
    `## 第三场景`,
    `【画面】故事的高潮部分`,
    `【对白】关键对话`,
    ``,
    `---`,
    `*本剧本由 AI 自动生成*`
  ].join('\n');

  const tokens = Math.ceil(content.length / 4);
  
  return { content, tokens, provider: 'placeholder' };
}

router.post('/generate', authMiddleware, async (req, res) => {
  const { projectId, title, description, style, length, modelName } = req.body || {};
  const userId = req.user.id;

  // 验证 projectId
  if (!projectId) {
    return res.status(400).json({ message: '缺少项目ID' });
  }

  try {
    // 验证项目是否属于当前用户
    const project = await queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    // 检查该项目是否已有剧本
    const existingScript = await queryOne('SELECT id FROM scripts WHERE project_id = ?', [projectId]);
    if (existingScript) {
      return res.status(400).json({ message: '该项目已有剧本，每个项目只能有一个剧本' });
    }

    // 使用指定的模型或默认使用 DeepSeek
    const selectedModel = modelName || 'DeepSeek Chat';
    
    // 调用 AI 模型生成剧本
    const prompt = `请根据以下信息创作一个${length}的${style}风格视频剧本：
标题：${title}
描述：${description}

要求：
1. 分成多个场景，每个场景独立完整
2. 每个场景包含画面描述和对白
3. 适合视频化呈现`;

    const result = await callAIModel(selectedModel, {
      messages: [
        { role: 'system', content: '你是一个专业的视频剧本创作助手' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 4000,
      temperature: 0.7
    });

    const content = result.content;
    const tokens = result.tokens || 0;
    const provider = result._model?.provider || 'unknown';
    
    // 计算费用（价格从模型配置中获取）
    const unitPrice = 0.0000014; // DeepSeek 价格
    const amount = tokens * unitPrice;

    // 检查用户余额
    const user = await queryOne('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user || user.balance < amount) {
      return res.status(402).json({ 
        message: '余额不足，请充值',
        required: amount,
        current: user?.balance || 0
      });
    }

    // 扣除余额
    await execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

    // 保存剧本（包含 project_id）
    await execute('INSERT INTO scripts (user_id, project_id, title, content, model_provider, token_used) VALUES (?, ?, ?, ?, ?, ?)', 
      [userId, projectId, title || null, content, provider, tokens]);
    const scriptId = await getLastInsertId();

    // 记录计费
    await execute('INSERT INTO billing_records (user_id, script_id, operation, model_provider, model_tier, tokens, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
      [userId, scriptId, '剧本生成', provider, 'standard', tokens, unitPrice, amount]);

    const newBalance = user.balance - amount;

    res.json({
      id: scriptId,
      title: title || null,
      content,
      model_provider: provider,
      token_used: tokens,
      balance: newBalance,
      billing: {
        tokens,
        unit_price: unitPrice,
        amount
      },
      message: '剧本生成成功'
    });
  } catch (error) {
    console.error('[Generate Script]', error);
    res.status(500).json({ message: '生成失败：' + error.message });
  }
});

// 获取指定项目的剧本
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    // 验证项目归属
    const project = await queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    // 获取项目的剧本
    const script = await queryOne(
      'SELECT id, title, content, model_provider, token_used, created_at FROM scripts WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!script) {
      return res.json({ script: null });
    }

    return res.json({ script });
  } catch (err) {
    console.error('DB error fetching script:', err);
    return res.status(500).json({ message: '获取剧本失败' });
  }
});

// 获取所有剧本（保留原接口）
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await queryAll('SELECT id, title, content, model_provider, token_used, created_at FROM scripts WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return res.json(rows);
  } catch (err) {
    console.error('DB error fetching scripts:', err);
    return res.status(500).json({ message: 'Failed to fetch scripts' });
  }
});

// 更新剧本
router.put('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, content } = req.body;

  if (!content) {
    return res.status(400).json({ message: '剧本内容不能为空' });
  }

  try {
    // 验证剧本归属
    const script = await queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!script) {
      return res.status(404).json({ message: '剧本不存在或无权访问' });
    }

    // 更新剧本
    await execute(
      'UPDATE scripts SET title = ?, content = ? WHERE id = ? AND user_id = ?',
      [title || null, content, id, userId]
    );

    return res.json({ message: '剧本保存成功' });
  } catch (err) {
    console.error('DB error updating script:', err);
    return res.status(500).json({ message: '保存剧本失败' });
  }
});

// 删除剧本
router.delete('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // 验证剧本归属
    const script = await queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!script) {
      return res.status(404).json({ message: '剧本不存在或无权访问' });
    }

    // 删除剧本
    await execute('DELETE FROM scripts WHERE id = ? AND user_id = ?', [id, userId]);

    return res.json({ message: '剧本删除成功' });
  } catch (err) {
    console.error('DB error deleting script:', err);
    return res.status(500).json({ message: '删除剧本失败' });
  }
});

module.exports = router;