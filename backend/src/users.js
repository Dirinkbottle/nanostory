const express = require('express');
const { queryOne } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { listBillingRecords, getBillingStats } = require('./aiBillingService');

const router = express.Router();

// 获取用户信息（包括余额）
router.get('/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await queryOne(
      'SELECT id, email, balance, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('[User Profile]', error);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// 获取消费记录
router.get('/billing', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {
    limit: rawLimit = 20,
    offset: rawOffset,
    page: rawPage,
    chargeStatus,
    modelCategory,
    sourceType
  } = req.query;

  try {
    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);
    const page = parseInt(rawPage, 10) || 0;
    const offset = page > 0 ? (page - 1) * limit : (parseInt(rawOffset, 10) || 0);

    const result = await listBillingRecords(userId, {
      limit,
      offset,
      chargeStatus: chargeStatus || null,
      modelCategory: modelCategory || null,
      sourceType: sourceType || null
    });

    res.json(result);
  } catch (error) {
    console.error('[User Billing]', error);
    res.status(500).json({ message: '获取消费记录失败' });
  }
});

// 获取消费统计
router.get('/stats', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const stats = await getBillingStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('[User Stats]', error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

module.exports = router;
