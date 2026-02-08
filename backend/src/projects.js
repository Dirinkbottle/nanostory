const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { VISUAL_STYLE_PRESETS } = require('./utils/getProjectStyle');

const router = express.Router();

// 获取视觉风格预设列表
router.get('/style-presets', authMiddleware, (req, res) => {
  const presets = Object.entries(VISUAL_STYLE_PRESETS).map(([label, prompt]) => ({ label, prompt }));
  res.json({ presets });
});

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

// 获取项目的 AI 模型选择
router.get('/:id/models', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const project = await queryOne(
      'SELECT use_models FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!project) {
      return res.status(404).json({ message: '工程不存在' });
    }

    let useModels = {};
    try {
      useModels = typeof project.use_models === 'string'
        ? JSON.parse(project.use_models)
        : project.use_models || {};
    } catch (e) {
      useModels = {};
    }

    res.json({ useModels });
  } catch (error) {
    console.error('[Project Models Get]', error);
    res.status(500).json({ message: '获取模型配置失败' });
  }
});

// 更新项目的 AI 模型选择
router.put('/:id/models', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { useModels } = req.body;

  try {
    const existing = await queryOne(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ message: '工程不存在' });
    }

    await execute(
      'UPDATE projects SET use_models = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(useModels || {}), id, userId]
    );

    res.json({ message: '模型配置已保存', useModels });
  } catch (error) {
    console.error('[Project Models Update]', error);
    res.status(500).json({ message: '保存模型配置失败' });
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