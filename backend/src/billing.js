const express = require('express');
const { queryOne, queryAll } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

router.get('/summary', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const row = await queryOne('SELECT COALESCE(SUM(tokens), 0) as total_tokens, COALESCE(SUM(amount), 0) as total_amount FROM billing_records WHERE user_id = ?', [userId]);

    return res.json({
      total_tokens: row ? row.total_tokens : 0,
      total_amount: row ? row.total_amount : 0
    });
  } catch (err) {
    console.error('DB error in billing summary:', err);
    return res.status(500).json({ message: 'Failed to fetch billing summary' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await queryAll('SELECT id, script_id, operation, model_provider, tokens, unit_price, amount, created_at FROM billing_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [userId]);

    return res.json(rows);
  } catch (err) {
    console.error('DB error in billing history:', err);
    return res.status(500).json({ message: 'Failed to fetch billing history' });
  }
});

module.exports = router;