const express = require('express');
const { queryOne, queryAll, execute, getLastInsertId } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { callAIModel } = require('./aiModelService');

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

// 生成角色三视图提示词
router.post('/:id/generate-views', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { style = '动漫风格' } = req.body;

  try {
    const character = await queryOne(
      'SELECT * FROM characters WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!character) {
      return res.status(404).json({ message: '角色不存在' });
    }

    // 使用 AI 生成三视图的详细描述
    const prompt = `请根据以下角色信息，生成角色三视图的图片生成提示词（用于AI生图）。

【角色信息】
名称：${character.name}
描述：${character.description || '无'}
外貌特征：${character.appearance || '无'}
性格特点：${character.personality || '无'}

【输出要求】
请输出 JSON 格式，包含三个视图的英文提示词：
{
  "front": "正面视图提示词（英文，详细描述角色正面形象、服装、表情）",
  "side": "侧面视图提示词（英文，详细描述角色侧面轮廓、发型、体态）",
  "back": "背面视图提示词（英文，详细描述角色背面、发型后侧、服装细节）",
  "characterSheet": "角色设计稿提示词（英文，用于生成统一的三视图设计稿）"
}

风格要求：${style}，高质量，专业角色设计，白色背景，全身像

只输出 JSON，不要其他内容。`;

    const result = await callAIModel('DeepSeek Chat', {
      messages: [
        { role: 'system', content: '你是一个专业的角色设计师，擅长生成AI绘图提示词。只输出JSON格式。' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 2000,
      temperature: 0.7
    });

    // 解析结果
    let viewPrompts;
    try {
      let jsonStr = result.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      viewPrompts = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('解析三视图提示词失败:', parseError);
      return res.status(500).json({ message: '生成提示词失败，请重试' });
    }

    // 更新角色的生成提示词
    await execute(
      `UPDATE characters SET generation_prompt = ?, generation_status = 'pending' WHERE id = ?`,
      [JSON.stringify(viewPrompts), id]
    );

    res.json({
      message: '三视图提示词生成成功',
      prompts: viewPrompts,
      characterId: id
    });
  } catch (error) {
    console.error('[Generate Character Views]', error);
    res.status(500).json({ message: '生成三视图失败: ' + error.message });
  }
});

// 从分镜中提取角色、场景、道具资源
router.post('/extract-from-storyboard', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { projectId, scriptId, storyboardId, scenes } = req.body;

  if (!projectId || !scenes || !Array.isArray(scenes)) {
    return res.status(400).json({ message: '参数错误' });
  }

  try {
    const extractedResources = {
      characters: [],
      scenes: [],
      props: []
    };

    // 收集所有角色、场景、道具
    const allCharacters = new Set();
    const allLocations = new Set();
    const allProps = new Set();

    scenes.forEach(scene => {
      if (scene.characters) {
        scene.characters.forEach(c => allCharacters.add(c));
      }
      if (scene.location) {
        allLocations.add(scene.location);
      }
      if (scene.props) {
        scene.props.forEach(p => allProps.add(p));
      }
    });

    // 创建角色资源
    for (const charName of allCharacters) {
      // 检查是否已存在
      const existing = await queryOne(
        'SELECT id FROM characters WHERE user_id = ? AND project_id = ? AND name = ?',
        [userId, projectId, charName]
      );
      
      if (!existing) {
        await execute(
          `INSERT INTO characters (user_id, project_id, script_id, name, source) VALUES (?, ?, ?, ?, 'ai_extracted')`,
          [userId, projectId, scriptId || null, charName]
        );
        const id = await getLastInsertId();
        extractedResources.characters.push({ id, name: charName });
      }
    }

    // 创建场景资源
    for (const location of allLocations) {
      const existing = await queryOne(
        'SELECT id FROM scenes WHERE user_id = ? AND project_id = ? AND name = ?',
        [userId, projectId, location]
      );
      
      if (!existing) {
        await execute(
          `INSERT INTO scenes (user_id, project_id, script_id, name, source) VALUES (?, ?, ?, ?, 'ai_extracted')`,
          [userId, projectId, scriptId || null, location]
        );
        const id = await getLastInsertId();
        extractedResources.scenes.push({ id, name: location });
      }
    }

    // 创建道具资源
    for (const propName of allProps) {
      const existing = await queryOne(
        'SELECT id FROM props WHERE user_id = ? AND project_id = ? AND name = ?',
        [userId, projectId, propName]
      );
      
      if (!existing) {
        await execute(
          `INSERT INTO props (user_id, project_id, script_id, name, source) VALUES (?, ?, ?, ?, 'ai_extracted')`,
          [userId, projectId, scriptId || null, propName]
        );
        const id = await getLastInsertId();
        extractedResources.props.push({ id, name: propName });
      }
    }

    res.json({
      message: '资源提取成功',
      extracted: extractedResources,
      stats: {
        characters: extractedResources.characters.length,
        scenes: extractedResources.scenes.length,
        props: extractedResources.props.length
      }
    });
  } catch (error) {
    console.error('[Extract Resources]', error);
    res.status(500).json({ message: '提取资源失败: ' + error.message });
  }
});

module.exports = router;