const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

const router = express.Router();

// 获取所有场景
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  try {
    const scenes = queryAll(
      'SELECT * FROM scenes WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ scenes });
  } catch (error) {
    console.error('[Scenes List]', error);
    res.status(500).json({ message: '获取场景列表失败' });
  }
});

// 获取单个场景
router.get('/:id', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const scene = queryOne(
      'SELECT * FROM scenes WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!scene) {
      return res.status(404).json({ message: '场景不存在' });
    }
    
    res.json(scene);
  } catch (error) {
    console.error('[Scene Detail]', error);
    res.status(500).json({ message: '获取场景失败' });
  }
});

// 创建场景
router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { name, description, environment, lighting, mood, image_url, tags } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: '场景名称不能为空' });
  }
  
  try {
    execute(
      `INSERT INTO scenes (user_id, name, description, environment, lighting, mood, image_url, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description || '', environment || '', lighting || '', mood || '', image_url || '', tags || '']
    );
    
    const id = getLastInsertId();
    const scene = queryOne('SELECT * FROM scenes WHERE id = ?', [id]);
    
    res.json({ message: '场景创建成功', scene });
  } catch (error) {
    console.error('[Scene Create]', error);
    res.status(500).json({ message: '创建场景失败' });
  }
});

// 更新场景
router.put('/:id', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, environment, lighting, mood, image_url, tags } = req.body;
  
  try {
    const existing = queryOne(
      'SELECT * FROM scenes WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!existing) {
      return res.status(404).json({ message: '场景不存在' });
    }
    
    execute(
      `UPDATE scenes 
       SET name = ?, description = ?, environment = ?, lighting = ?, mood = ?, image_url = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [name || existing.name, description || existing.description, environment || existing.environment, 
       lighting || existing.lighting, mood || existing.mood, image_url || existing.image_url, tags || existing.tags, id, userId]
    );
    
    const scene = queryOne('SELECT * FROM scenes WHERE id = ?', [id]);
    
    res.json({ message: '场景更新成功', scene });
  } catch (error) {
    console.error('[Scene Update]', error);
    res.status(500).json({ message: '更新场景失败' });
  }
});

// 删除场景
router.delete('/:id', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const existing = queryOne(
      'SELECT * FROM scenes WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!existing) {
      return res.status(404).json({ message: '场景不存在' });
    }
    
    execute('DELETE FROM scenes WHERE id = ? AND user_id = ?', [id, userId]);
    
    res.json({ message: '场景删除成功' });
  } catch (error) {
    console.error('[Scene Delete]', error);
    res.status(500).json({ message: '删除场景失败' });
  }
});

module.exports = router;
