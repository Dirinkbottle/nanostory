const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

// 获取所有角色
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const characters = await queryAll(
      'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({ characters });
  } catch (error) {
    console.error('[Characters List]', error);
    res.status(500).json({ message: '获取角色列表失败' });
  }
});

// 获取单个角色
router.get('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const character = await queryOne(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!character) {
      return res.status(404).json({ message: '角色不存在' });
    }

    res.json(character);
  } catch (error) {
    console.error('[Character Detail]', error);
    res.status(500).json({ message: '获取角色失败' });
  }
});

// 创建角色
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { name, description, appearance, personality, image_url, tags } = req.body;

  if (!name) {
    return res.status(400).json({ message: '角色名称不能为空' });
  }

  try {
    await execute(
      `INSERT INTO characters (user_id, name, description, appearance, personality, image_url, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description || '', appearance || '', personality || '', image_url || '', tags || '']
    );

    const id = await getLastInsertId();
    const character = await queryOne('SELECT * FROM characters WHERE id = ?', [id]);

    res.json({ message: '角色创建成功', character });
  } catch (error) {
    console.error('[Character Create]', error);
    res.status(500).json({ message: '创建角色失败' });
  }
});

// 更新角色
router.put('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, appearance, personality, image_url, tags } = req.body;

  try {
    const existing = await queryOne(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '角色不存在' });
    }

    await execute(
      `UPDATE characters 
       SET name = ?, description = ?, appearance = ?, personality = ?, image_url = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [name || existing.name, description || existing.description, appearance || existing.appearance,
       personality || existing.personality, image_url || existing.image_url, tags || existing.tags, id, userId]
    );

    const character = await queryOne('SELECT * FROM characters WHERE id = ?', [id]);

    res.json({ message: '角色更新成功', character });
  } catch (error) {
    console.error('[Character Update]', error);
    res.status(500).json({ message: '更新角色失败' });
  }
});

// 删除角色
router.delete('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existing = await queryOne(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '角色不存在' });
    }

    await execute('DELETE FROM characters WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ message: '角色删除成功' });
  } catch (error) {
    console.error('[Character Delete]', error);
    res.status(500).json({ message: '删除角色失败' });
  }
});

module.exports = router;