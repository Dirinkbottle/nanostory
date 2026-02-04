const express = require('express');
const { db } = require('../src/db');
const { authMiddleware } = require('../src/middleware');

const router = express.Router();

const DEFAULT_TEMPLATES = [
  {
    id: 'closeup-dialogue',
    name: '人物近景对话',
    prompt_template: '{角色} 的近景特写，在 {场景} 中进行对话，镜头类型：近景，风格：{风格}',
  },
  {
    id: 'wide-shot-scene',
    name: '远景场景展示',
    prompt_template: '广角镜头展示 {场景} 的整体环境，包含 {角色}，镜头类型：远景，风格：{风格}',
  },
  {
    id: 'action-shot',
    name: '动作镜头',
    prompt_template: '{角色} 在 {场景} 中做 {动作}，镜头类型：运动镜头，风格：{风格}',
  },
];

router.get('/templates', authMiddleware, (_req, res) => {
  res.json(DEFAULT_TEMPLATES);
});

router.get('/:scriptId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);

  if (!scriptId) {
    return res.status(400).json({ message: 'Invalid script id' });
  }

  db.get(
    'SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1',
    [scriptId, userId],
    (err, script) => {
      if (err) {
        console.error('DB error fetching script for storyboards:', err);
        return res.status(500).json({ message: 'Failed to fetch script' });
      }

      if (!script) {
        return res.status(404).json({ message: 'Script not found' });
      }

      db.all(
        'SELECT id, idx, prompt_template, variables_json, image_ref, created_at FROM storyboards WHERE script_id = ? ORDER BY idx ASC',
        [scriptId],
        (sbErr, rows) => {
          if (sbErr) {
            console.error('DB error fetching storyboards:', sbErr);
            return res.status(500).json({ message: 'Failed to fetch storyboards' });
          }

          const result = rows.map((row) => ({
            id: row.id,
            index: row.idx,
            prompt_template: row.prompt_template,
            variables: row.variables_json ? JSON.parse(row.variables_json) : {},
            image_ref: row.image_ref,
            created_at: row.created_at,
          }));

          return res.json(result);
        }
      );
    }
  );
});

router.post('/:scriptId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);
  const { items } = req.body || {};

  if (!scriptId || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  db.get(
    'SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1',
    [scriptId, userId],
    (err, script) => {
      if (err) {
        console.error('DB error validating script for storyboards:', err);
        return res.status(500).json({ message: 'Failed to validate script' });
      }

      if (!script) {
        return res.status(404).json({ message: 'Script not found' });
      }

      db.serialize(() => {
        db.run('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);

        const stmt = db.prepare(
          'INSERT INTO storyboards (script_id, idx, prompt_template, variables_json, image_ref) VALUES (?, ?, ?, ?, ?)'
        );

        items.forEach((item, idx) => {
          const index = typeof item.index === 'number' ? item.index : idx + 1;
          const promptTemplate = item.prompt_template || '';
          const variablesJson = JSON.stringify(item.variables || {});
          const imageRef = item.image_ref || null;

          stmt.run([scriptId, index, promptTemplate, variablesJson, imageRef]);
        });

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            console.error('DB error inserting storyboards:', finalizeErr);
            return res.status(500).json({ message: 'Failed to save storyboards' });
          }

          return res.json({ message: 'Storyboards saved' });
        });
      });
    }
  );
});

module.exports = router;
