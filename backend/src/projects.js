const express = require('express');
const { queryOne, queryAll, execute } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { VISUAL_STYLE_PRESETS } = require('./utils/getProjectStyle');
const { callAIModel } = require('./aiModelService');

const router = express.Router();

// 获取视觉风格预设列表
router.get('/style-presets', authMiddleware, (req, res) => {
  const presets = Object.entries(VISUAL_STYLE_PRESETS).map(([label, prompt]) => ({ label, prompt }));
  res.json({ presets });
});

// AI 智能推荐项目设置
router.post('/suggest-settings', authMiddleware, async (req, res) => {
  const { name, description } = req.body;

  if (!name && !description) {
    return res.status(400).json({ message: '请提供项目名称或描述' });
  }

  try {
    // 构建提示词
    const visualStyles = Object.keys(VISUAL_STYLE_PRESETS).join('、');
    const prompt = `你是一个专业的动漫/影视项目顾问。请根据以下项目信息，推荐最合适的风格设置。

项目名称：${name || '未提供'}
项目描述：${description || '未提供'}

可选的视觉风格：${visualStyles}

请以JSON格式返回推荐结果，格式如下：
{
  "visualStyle": "推荐的视觉风格（必须从可选列表中选择一个）",
  "storyStyle": "推荐的叙事风格（如：热血少年漫、悬疑推理、浪漫爱情、温馨日常、奇幻冒险等）",
  "storyConstraints": "推荐的剧本约束（如：不要魔法元素、现代都市背景、避免暴力描写等，用简短的一句话描述）"
}

注意：
1. visualStyle 必须严格从可选列表中选择
2. storyStyle 和 storyConstraints 要根据项目名称和描述的语义来推断
3. 只返回JSON，不要有其他文字说明`;

    // 调用AI模型（使用第一个可用的文本模型）
    const textModel = await queryOne(
      "SELECT name FROM ai_model_configs WHERE category = 'TEXT' AND is_active = 1 ORDER BY id ASC LIMIT 1"
    );

    if (!textModel) {
      return res.status(500).json({ message: '没有可用的文本模型' });
    }

    const result = await callAIModel(textModel.name, {
      messages: [{ role: 'user', content: prompt }]
    });

    // 解析AI返回的JSON
    let suggestions;
    try {
      // 尝试从返回内容中提取JSON
      let content = result.content || result.text || result.message || '';
      
      // 如果内容包含markdown代码块，提取其中的JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        content = jsonMatch[1].trim();
      }
      
      suggestions = JSON.parse(content);
    } catch (parseError) {
      console.error('[Suggest Settings] JSON解析失败:', parseError);
      // 返回默认推荐
      suggestions = {
        visualStyle: '日系动漫',
        storyStyle: '热血少年漫',
        storyConstraints: ''
      };
    }

    // 验证 visualStyle 是否在预设列表中
    if (!VISUAL_STYLE_PRESETS[suggestions.visualStyle]) {
      suggestions.visualStyle = '日系动漫';
    }

    // 添加对应的 visualStylePrompt
    suggestions.visualStylePrompt = VISUAL_STYLE_PRESETS[suggestions.visualStyle] || '';

    res.json({ suggestions });
  } catch (error) {
    console.error('[Suggest Settings]', error);
    res.status(500).json({ message: 'AI推荐失败，请稍后重试' });
  }
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
    const result = await execute(
      `INSERT INTO projects (user_id, name, description, cover_url, type, status, settings_json) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description || '', cover_url || '', type || 'comic', status || 'draft', settings_json || '{}']
    );

    const id = result.insertId;
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