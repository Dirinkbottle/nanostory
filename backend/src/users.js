const express = require('express');
const { queryOne, queryAll } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

// 获取用户信息（包括余额）
router.get('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  try {
    const user = queryOne(
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
router.get('/billing', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const records = queryAll(
      `SELECT 
        id,
        script_id,
        operation,
        model_provider,
        model_tier,
        tokens,
        unit_price,
        amount,
        created_at
      FROM billing_records 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    const total = queryOne(
      'SELECT COUNT(*) as count FROM billing_records WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      records,
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[User Billing]', error);
    res.status(500).json({ message: '获取消费记录失败' });
  }
});

// 获取消费统计
router.get('/stats', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  try {
    const totalSpent = queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM billing_records WHERE user_id = ?',
      [userId]
    );
    
    const scriptCount = queryOne(
      'SELECT COUNT(*) as count FROM scripts WHERE user_id = ?',
      [userId]
    );
    
    const videoCount = queryOne(
      `SELECT COUNT(*) as count FROM billing_records 
       WHERE user_id = ? AND operation = '视频生成'`,
      [userId]
    );
    
    res.json({
      totalSpent: totalSpent.total,
      scriptCount: scriptCount.count,
      videoCount: videoCount.count
    });
  } catch (error) {
    console.error('[User Stats]', error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

module.exports = router;
