const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

// 获取所有剧本资产
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const scriptAssets = await queryAll(
      'SELECT * FROM script_assets WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({ scriptAssets });
  } catch (error) {
    console.error('[ScriptAssets List]', error);
    res.status(500).json({ message: '获取剧本列表失败' });
  }
});

// 获取单个剧本资产
router.get('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const scriptAsset = await queryOne(
      'SELECT * FROM script_assets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!scriptAsset) {
      return res.status(404).json({ message: '剧本不存在' });
    }

    res.json(scriptAsset);
  } catch (error) {
    console.error('[ScriptAsset Detail]', error);
    res.status(500).json({ message: '获取剧本失败' });
  }
});

// 创建剧本资产
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { name, description, content, genre, duration, image_url, tags } = req.body;

  if (!name) {
    return res.status(400).json({ message: '剧本名称不能为空' });
  }

  try {
    await execute(
      `INSERT INTO script_assets (user_id, name, description, content, genre, duration, image_url, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description || '', content || '', genre || '', duration || '', image_url || '', tags || '']
    );

    const id = await getLastInsertId();
    const scriptAsset = await queryOne('SELECT * FROM script_assets WHERE id = ?', [id]);

    res.json({ message: '剧本创建成功', scriptAsset });
  } catch (error) {
    console.error('[ScriptAsset Create]', error);
    res.status(500).json({ message: '创建剧本失败' });
  }
});

// 更新剧本资产
router.put('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, content, genre, duration, image_url, tags } = req.body;

  try {
    const existing = await queryOne(
      'SELECT * FROM script_assets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '剧本不存在' });
    }

    await execute(
      `UPDATE script_assets 
       SET name = ?, description = ?, content = ?, genre = ?, duration = ?, image_url = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [name || existing.name, description || existing.description, content || existing.content,
       genre || existing.genre, duration || existing.duration, image_url || existing.image_url,
       tags || existing.tags, id, userId]
    );

    const scriptAsset = await queryOne('SELECT * FROM script_assets WHERE id = ?', [id]);

    res.json({ message: '剧本更新成功', scriptAsset });
  } catch (error) {
    console.error('[ScriptAsset Update]', error);
    res.status(500).json({ message: '更新剧本失败' });
  }
});

// 删除剧本资产
router.delete('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existing = await queryOne(
      'SELECT * FROM script_assets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '剧本不存在' });
    }

    await execute('DELETE FROM script_assets WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ message: '剧本删除成功' });
  } catch (error) {
    console.error('[ScriptAsset Delete]', error);
    res.status(500).json({ message: '删除剧本失败' });
  }
});

module.exports = router;