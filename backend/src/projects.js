const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

// 获取所有工程
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const projects = await queryAll(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    res.json({ projects });
  } catch (error) {
    console.error('[Projects List]', error);
    res.status(500).json({ message: '获取工程列表失败' });
  }
});

// 获取单个工程
router.get('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const project = await queryOne(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!project) {
      return res.status(404).json({ message: '工程不存在' });
    }

    res.json(project);
  } catch (error) {
    console.error('[Project Detail]', error);
    res.status(500).json({ message: '获取工程失败' });
  }
});

// 创建工程
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { name, description, cover_url, type, status, settings_json } = req.body;

  if (!name) {
    return res.status(400).json({ message: '工程名称不能为空' });
  }

  try {
    await execute(
      `INSERT INTO projects (user_id, name, description, cover_url, type, status, settings_json) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description || '', cover_url || '', type || 'comic', status || 'draft', settings_json || '{}']
    );

    const id = await getLastInsertId();
    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [id]);

    res.json({ message: '工程创建成功', project });
  } catch (error) {
    console.error('[Project Create]', error);
    res.status(500).json({ message: '创建工程失败' });
  }
});

// 更新工程
router.put('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, cover_url, type, status, settings_json } = req.body;

  try {
    const existing = await queryOne(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '工程不存在' });
    }

    await execute(
      `UPDATE projects 
       SET name = ?, description = ?, cover_url = ?, type = ?, status = ?, settings_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        cover_url !== undefined ? cover_url : existing.cover_url,
        type || existing.type,
        status || existing.status,
        settings_json !== undefined ? settings_json : existing.settings_json,
        id, userId
      ]
    );

    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [id]);

    res.json({ message: '工程更新成功', project });
  } catch (error) {
    console.error('[Project Update]', error);
    res.status(500).json({ message: '更新工程失败' });
  }
});

// 删除工程
router.delete('/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existing = await queryOne(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '工程不存在' });
    }

    await execute('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ message: '工程删除成功' });
  } catch (error) {
    console.error('[Project Delete]', error);
    res.status(500).json({ message: '删除工程失败' });
  }
});

module.exports = router;