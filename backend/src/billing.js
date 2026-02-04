const express = require('express');
const { db } = require('../src/db');
const { authMiddleware } = require('../src/middleware');

const router = express.Router();

router.get('/summary', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.get(
    'SELECT COALESCE(SUM(tokens), 0) as total_tokens, COALESCE(SUM(amount), 0) as total_amount FROM billing_records WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        console.error('DB error in billing summary:', err);
        return res.status(500).json({ message: 'Failed to fetch billing summary' });
      }

      return res.json({
        total_tokens: row.total_tokens || 0,
        total_amount: row.total_amount || 0
      });
    }
  );
});

router.get('/history', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT id, script_id, operation, model_provider, tokens, unit_price, amount, created_at FROM billing_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('DB error in billing history:', err);
        return res.status(500).json({ message: 'Failed to fetch billing history' });
      }

      return res.json(rows);
    }
  );
});

module.exports = router;
