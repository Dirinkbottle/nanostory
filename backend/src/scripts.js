const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { TEXT_MODELS } = require('./models');

const router = express.Router();

// DeepSeek API 调用
async function callDeepSeek({ title, description, style, length }) {
  // 暂时使用占位实现，等待真实 API key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.warn('[DeepSeek] API key not set, using placeholder');
    return generatePlaceholderScript({ title, description, style, length });
  }

  try {
    const prompt = `请根据以下信息创作一个${length}视频剧本：
标题：${title}
故事概述：${description}
风格：${style}

要求：
1. 分成多个场景
2. 每个场景包含画面描述和对白
3. 适合视频化呈现`;

    const response = await fetch(TEXT_MODELS.deepseek.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: TEXT_MODELS.deepseek.model,
        messages: [
          { role: 'system', content: '你是一个专业的视频剧本创作助手' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'DeepSeek API调用失败');
    }

    const content = data.choices[0].message.content;
    const tokens = data.usage.total_tokens;
    
    return { content, tokens, provider: 'deepseek' };
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
  const { title, description, style, length } = req.body || {};
  const userId = req.user.id;

  try {
    // 调用 DeepSeek 生成剧本
    const { content, tokens, provider } = await callDeepSeek({ title, description, style, length });
    
    // 计算费用
    const unitPrice = TEXT_MODELS.deepseek.pricing.perToken;
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

    // 保存剧本
    await execute('INSERT INTO scripts (user_id, title, content, model_provider, token_used) VALUES (?, ?, ?, ?, ?)', 
      [userId, title || null, content, provider, tokens]);
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

module.exports = router;