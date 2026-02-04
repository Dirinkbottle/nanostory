const express = require('express');
const { db } = require('../src/db');
const { authMiddleware } = require('../src/middleware');

const router = express.Router();

// Simple placeholder LLM script generator
function generateScriptText({ title, description, style, length }) {
  const safeTitle = title || '未命名剧本';
  const safeDesc = description || '一个关于创意视频的故事';
  const safeStyle = style || '通用风格';
  const safeLength = length || '短篇';

  return [
    `标题：${safeTitle}`,
    `风格：${safeStyle}`,
    `长度：${safeLength}`,
    '',
    `故事概要：${safeDesc}`,
    '',
    '【第一幕】',
    '这里是自动生成的第一幕内容。',
    '',
    '【第二幕】',
    '这里是自动生成的第二幕内容。'
  ].join('\n');
}

function estimateTokens(text) {
  if (!text) return 0;
  const length = text.length;
  return Math.max(1, Math.round(length / 4));
}

router.post('/generate', authMiddleware, (req, res) => {
  const { title, description, style, length, provider } = req.body || {};
  const userId = req.user.id;

  const content = generateScriptText({ title, description, style, length });
  const tokens = estimateTokens(content);
  const modelProvider = provider || 'placeholder';
  const unitPrice = 0.0001;
  const amount = tokens * unitPrice;

  db.run(
    'INSERT INTO scripts (user_id, title, content, model_provider, token_used) VALUES (?, ?, ?, ?, ?)',
    [userId, title || null, content, modelProvider, tokens],
    function (err) {
      if (err) {
        console.error('DB error inserting script:', err);
        return res.status(500).json({ message: 'Failed to save script' });
      }

      const scriptId = this.lastID;

      db.run(
        'INSERT INTO billing_records (user_id, script_id, operation, model_provider, tokens, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, scriptId, 'script_generation', modelProvider, tokens, unitPrice, amount],
        (billingErr) => {
          if (billingErr) {
            console.error('DB error inserting billing record:', billingErr);
          }

          return res.json({
            id: scriptId,
            title: title || null,
            content,
            model_provider: modelProvider,
            token_used: tokens,
            billing: {
              tokens,
              unit_price: unitPrice,
              amount
            }
          });
        }
      );
    }
  );
});

router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.all(
    'SELECT id, title, content, model_provider, token_used, created_at FROM scripts WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('DB error fetching scripts:', err);
        return res.status(500).json({ message: 'Failed to fetch scripts' });
      }
      return res.json(rows);
    }
  );
});

module.exports = router;
