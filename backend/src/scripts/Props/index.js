const express = require('express');
const { queryOne, queryAll, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

const router = express.Router();

// 获取当前用户的所有道具
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const props = await queryAll(
      'SELECT * FROM props WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json({ props });
  } catch (error) {
    console.error('[Get Props]', error);
    res.status(500).json({ message: '获取道具列表失败' });
  }
});

// 获取指定项目的道具
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;
    
    // 验证项目权限
    const project = await queryOne(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }
    
    const props = await queryAll(
      'SELECT * FROM props WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    res.json({ props });
  } catch (error) {
    console.error('[Get Project Props]', error);
    res.status(500).json({ message: '获取项目道具失败' });
  }
});

// 创建道具
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, name, description, category, image_url, tags } = req.body;

    if (!name || !project_id) {
      return res.status(400).json({ message: '道具名称和项目ID为必填项' });
    }

    // 验证项目权限
    const project = await queryOne(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [project_id, userId]
    );
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    const result = await execute(
      `INSERT INTO props (user_id, project_id, name, description, category, image_url, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, project_id, name, description || '', category || '', image_url || '', tags || '']
    );

    const prop = await queryOne('SELECT * FROM props WHERE id = ?', [result.insertId]);
    res.status(201).json({ prop });
  } catch (error) {
    console.error('[Create Prop]', error);
    res.status(500).json({ message: '创建道具失败' });
  }
});

// 更新道具
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, category, image_url, tags } = req.body;

    // 验证道具所有权
    const prop = await queryOne(
      'SELECT * FROM props WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!prop) {
      return res.status(404).json({ message: '道具不存在或无权访问' });
    }

    await execute(
      `UPDATE props 
       SET name = ?, description = ?, category = ?, image_url = ?, tags = ?
       WHERE id = ?`,
      [
        name || prop.name,
        description !== undefined ? description : prop.description,
        category !== undefined ? category : prop.category,
        image_url !== undefined ? image_url : prop.image_url,
        tags !== undefined ? tags : prop.tags,
        id
      ]
    );

    const updatedProp = await queryOne('SELECT * FROM props WHERE id = ?', [id]);
    res.json({ prop: updatedProp });
  } catch (error) {
    console.error('[Update Prop]', error);
    res.status(500).json({ message: '更新道具失败' });
  }
});

// 删除道具
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 验证道具所有权
    const prop = await queryOne(
      'SELECT * FROM props WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!prop) {
      return res.status(404).json({ message: '道具不存在或无权访问' });
    }

    await execute('DELETE FROM props WHERE id = ?', [id]);
    res.json({ message: '道具删除成功' });
  } catch (error) {
    console.error('[Delete Prop]', error);
    res.status(500).json({ message: '删除道具失败' });
  }
});

module.exports = router;
