const express = require('express');
const { queryOne, execute } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { VIDEO_MODELS } = require('./models');

const router = express.Router();

// 获取所有视频模型配置
router.get('/models', (req, res) => {
  const models = Object.entries(VIDEO_MODELS).map(([key, config]) => ({
    id: key,
    ...config
  }));
  
  res.json({ models });
});

// 生成视频（占位实现）
router.post('/generate', authMiddleware, async (req, res) => {
  const { scriptId, modelTier, duration } = req.body;
  const userId = req.user.id;

  if (!modelTier || !VIDEO_MODELS[modelTier]) {
    return res.status(400).json({ message: '无效的模型档次' });
  }

  const model = VIDEO_MODELS[modelTier];

  try {
    // 计算费用
    const videoDuration = Math.min(duration || 10, model.maxDuration);
    const amount = videoDuration * model.pricing.perSecond;

    // 检查用户余额
    const user = queryOne('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user || user.balance < amount) {
      return res.status(402).json({ 
        message: '余额不足，请充值',
        required: amount,
        current: user?.balance || 0
      });
    }

    // 扣除余额
    execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

    // 记录计费
    execute(
      'INSERT INTO billing_records (user_id, script_id, operation, model_provider, model_tier, tokens, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, scriptId || null, '视频生成', model.provider, modelTier, videoDuration, model.pricing.perSecond, amount]
    );

    const newBalance = user.balance - amount;

    // 返回占位视频URL（实际应该调用真实API）
    res.json({
      success: true,
      videoUrl: `https://placeholder.video/${Date.now()}.mp4`,
      model: model.displayName,
      tier: model.tier,
      duration: videoDuration,
      cost: amount,
      balance: newBalance,
      message: '视频生成成功'
    });
  } catch (error) {
    console.error('[Video Generate]', error);
    res.status(500).json({ message: '生成失败：' + error.message });
  }
});

module.exports = router;
