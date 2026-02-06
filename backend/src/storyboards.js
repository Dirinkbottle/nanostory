const express = require('express');
const { queryOne, queryAll, execute } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { callAIModel } = require('./aiModelService');

const router = express.Router();

const DEFAULT_TEMPLATES = [
  {
    id: 'closeup-dialogue',
    name: '人物近景对话',
    prompt_template: '{角色} 的近景特写，在 {场景} 中进行对话，镜头类型：近景，风格：{风格}',
    category: '对话',
  },
  {
    id: 'wide-shot-scene',
    name: '远景场景展示',
    prompt_template: '广角镜头展示 {场景} 的整体环境，包含 {角色}，镜头类型：远景，风格：{风格}',
    category: '场景',
  },
  {
    id: 'action-shot',
    name: '动作镜头',
    prompt_template: '{角色} 在 {场景} 中做 {动作}，镜头类型：运动镜头，风格：{风格}',
    category: '动作',
  },
  {
    id: 'emotional-closeup',
    name: '情绪特写',
    prompt_template: '{角色} 面部表情特写，展现 {情绪} 的情感，背景虚化，镜头类型：特写，风格：{风格}',
    category: '对话',
  },
  {
    id: 'establishing-shot',
    name: '建立镜头',
    prompt_template: '从空中俯瞰 {场景}，建立整体环境氛围，时间：{时间}，天气：{天气}，风格：{风格}',
    category: '场景',
  },
  {
    id: 'chase-sequence',
    name: '追逐场景',
    prompt_template: '{角色} 在 {场景} 中快速奔跑/追逐，运动模糊效果，动态镜头跟随，风格：{风格}',
    category: '动作',
  },
  {
    id: 'transition-montage',
    name: '蒙太奇转场',
    prompt_template: '快速切换多个 {场景} 画面，展现时间流逝或空间变化，节奏：{节奏}，风格：{风格}',
    category: '转场',
  },
  {
    id: 'dramatic-reveal',
    name: '戏剧性揭示',
    prompt_template: '缓慢推进镜头，逐渐揭示 {对象}，在 {场景} 中营造悬念感，风格：{风格}',
    category: '场景',
  },
  {
    id: 'over-shoulder',
    name: '过肩镜头',
    prompt_template: '从 {角色A} 肩膀后方拍摄 {角色B}，展现两人对话关系，场景：{场景}，风格：{风格}',
    category: '对话',
  },
  {
    id: 'slow-motion',
    name: '慢动作',
    prompt_template: '{角色} 的 {动作} 以慢动作呈现，强调动作细节和戏剧性，场景：{场景}，风格：{风格}',
    category: '动作',
  },
];

router.get('/templates', authMiddleware, (_req, res) => {
  res.json(DEFAULT_TEMPLATES);
});

// 根据剧本内容自动生成分镜
router.post('/auto-generate/:scriptId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);

  if (!scriptId) {
    return res.status(400).json({ message: '无效的剧本ID' });
  }

  try {
    // 获取剧本内容
    const script = await queryOne(
      'SELECT id, project_id, title, content, episode_number FROM scripts WHERE id = ? AND user_id = ?', 
      [scriptId, userId]
    );

    if (!script) {
      return res.status(404).json({ message: '剧本不存在' });
    }

    if (!script.content || script.content.trim() === '') {
      return res.status(400).json({ message: '剧本内容为空，无法生成分镜' });
    }

    // 调用 AI 解析剧本并生成分镜
    const prompt = `请根据以下剧本内容，将其细化为电影级分镜镜头。

【剧本内容】
${script.content}

【核心要求 - 极度细化】
1. 每个分镜 = 一个静止画面，可直接生成一张图片
2. 对话场景必须拆分：
   - 每句对白一个镜头（说话人特写）
   - 穿插听者反应镜头
   - 适时加入双人镜头或场景全景
3. 动作场景必须拆分：
   - 动作准备阶段
   - 动作进行中
   - 动作结果
4. 场景切换时：
   - 先用远景/全景建立新场景
   - 再逐步推近到角色
5. 情绪变化点要单独一个特写镜头
6. 数量要求：一个场景至少拆成 5-10 个镜头

【输出 JSON 格式】
每个分镜包含：
- order: 分镜序号（从1开始）
- shotType: 镜头类型（"特写"/"近景"/"中景"/"全景"/"远景"/"俯拍"/"仰拍"/"过肩"）
- description: 画面描述（详细描述画面内容，要足够详细，可直接用于AI生图）
- hasAction: 是否有动作（true/false）
- startFrame: 首帧描述（仅当hasAction=true时）
- endFrame: 尾帧描述（仅当hasAction=true时）
- dialogue: 对白内容（如果有）
- duration: 建议时长（秒）
- characters: 出现的角色数组
- location: 场景地点
- emotion: 情绪氛围

只输出 JSON 数组，不要其他内容。示例：
[
  {"order": 1, "shotType": "远景", "description": "清晨的城市天际线，高楼大厦沐浴在金色晨光中", "hasAction": false, "dialogue": "", "duration": 2, "characters": [], "location": "城市外景", "emotion": "平静"},
  {"order": 2, "shotType": "全景", "description": "一栋现代写字楼，玻璃幕墙反射着朝阳", "hasAction": false, "dialogue": "", "duration": 1, "characters": [], "location": "写字楼外", "emotion": "平静"},
  {"order": 3, "shotType": "中景", "description": "办公室内景，主角站在窗前背对镜头", "hasAction": false, "dialogue": "", "duration": 2, "characters": ["主角"], "location": "办公室", "emotion": "沉思"},
  {"order": 4, "shotType": "特写", "description": "主角的手放在窗户玻璃上的特写", "hasAction": false, "dialogue": "", "duration": 1, "characters": ["主角"], "location": "办公室", "emotion": "沉思"},
  {"order": 5, "shotType": "近景", "description": "主角侧脸特写，眼神望向窗外", "hasAction": true, "startFrame": "主角侧脸望向窗外", "endFrame": "主角缓缓转头看向镜头", "dialogue": "新的一天又开始了...", "duration": 3, "characters": ["主角"], "location": "办公室", "emotion": "沉思"}
]`;

    const result = await callAIModel('DeepSeek Chat', {
      messages: [
        { role: 'system', content: '你是一个专业的电影分镜师。你的任务是将剧本极度细化为分镜，每个镜头只展示一个静止画面。规则：1）每句对白独立一个镜头；2）每个动作分解为准备-进行-结果；3）场景切换要从远到近层层推进；4）一个剧本场景至少拆成5-10个镜头。只输出JSON数组。' },
        { role: 'user', content: prompt }
      ],
      maxTokens: 8000,
      temperature: 0.3
    });

    // 解析 AI 返回的 JSON
    let scenes = [];
    try {
      // 尝试提取 JSON 内容
      let jsonStr = result.content;
      // 处理可能被包裹在 markdown 代码块中的情况
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      scenes = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('解析分镜 JSON 失败:', parseError);
      return res.status(500).json({ message: '分镜解析失败，请重试' });
    }

    // 保存到数据库
    await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
    
    for (const scene of scenes) {
      const idx = scene.order || scenes.indexOf(scene) + 1;
      const promptTemplate = scene.description || '';
      const variablesJson = JSON.stringify({
        shotType: scene.shotType || '中景',
        dialogue: scene.dialogue || '',
        duration: scene.duration || 3,
        characters: scene.characters || [],
        location: scene.location || '',
        emotion: scene.emotion || '',
        hasAction: scene.hasAction || false,
        startFrame: scene.startFrame || '',
        endFrame: scene.endFrame || ''
      });
      
      await execute(
        'INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json) VALUES (?, ?, ?, ?, ?)', 
        [script.project_id, scriptId, idx, promptTemplate, variablesJson]
      );
    }

    res.json({ 
      message: `成功生成 ${scenes.length} 个分镜`,
      scenes,
      episodeNumber: script.episode_number
    });
  } catch (error) {
    console.error('[Auto Generate Storyboard]', error);
    res.status(500).json({ message: '自动生成分镜失败: ' + error.message });
  }
});

router.get('/:scriptId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);

  if (!scriptId) {
    return res.status(400).json({ message: 'Invalid script id' });
  }

  try {
    const script = await queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1', [scriptId, userId]);

    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    const rows = await queryAll('SELECT id, idx, prompt_template, variables_json, image_ref, created_at FROM storyboards WHERE script_id = ? ORDER BY idx ASC', [scriptId]);

    const result = rows.map((row) => ({
      id: row.id,
      index: row.idx,
      prompt_template: row.prompt_template,
      variables: row.variables_json ? JSON.parse(row.variables_json) : {},
      image_ref: row.image_ref,
      created_at: row.created_at,
    }));

    return res.json(result);
  } catch (err) {
    console.error('DB error fetching storyboards:', err);
    return res.status(500).json({ message: 'Failed to fetch storyboards' });
  }
});

router.post('/:scriptId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);
  const { items } = req.body || {};

  if (!scriptId || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  try {
    const script = await queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1', [scriptId, userId]);

    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const index = typeof item.index === 'number' ? item.index : idx + 1;
      const promptTemplate = item.prompt_template || '';
      const variablesJson = JSON.stringify(item.variables || {});
      const imageRef = item.image_ref || null;

      await execute('INSERT INTO storyboards (script_id, idx, prompt_template, variables_json, image_ref) VALUES (?, ?, ?, ?, ?)', [scriptId, index, promptTemplate, variablesJson, imageRef]);
    }

    return res.json({ message: 'Storyboards saved' });
  } catch (err) {
    console.error('DB error saving storyboards:', err);
    return res.status(500).json({ message: 'Failed to save storyboards' });
  }
});

// 更新单个分镜的图片或视频
router.patch('/:storyboardId/media', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);
  const { imageUrl, videoUrl, startFrame, endFrame } = req.body;

  if (!storyboardId) {
    return res.status(400).json({ message: '无效的分镜ID' });
  }

  try {
    // 验证分镜属于当前用户
    const storyboard = await queryOne(`
      SELECT s.id FROM storyboards s
      JOIN scripts sc ON s.script_id = sc.id
      WHERE s.id = ? AND sc.user_id = ?
    `, [storyboardId, userId]);

    if (!storyboard) {
      return res.status(404).json({ message: '分镜不存在' });
    }

    // 更新图片路径（首帧作为主图）
    if (imageUrl !== undefined) {
      await execute('UPDATE storyboards SET image_ref = ? WHERE id = ?', [imageUrl, storyboardId]);
    }
    
    // 更新 variables_json 中的其他字段
    const row = await queryOne('SELECT variables_json FROM storyboards WHERE id = ?', [storyboardId]);
    const variables = row?.variables_json ? JSON.parse(row.variables_json) : {};
    
    if (videoUrl !== undefined) {
      variables.videoUrl = videoUrl;
    }
    if (startFrame !== undefined) {
      variables.startFrame = startFrame;
    }
    if (endFrame !== undefined) {
      variables.endFrame = endFrame;
    }
    
    await execute('UPDATE storyboards SET variables_json = ? WHERE id = ?', [JSON.stringify(variables), storyboardId]);

    res.json({ success: true, message: '保存成功' });
  } catch (error) {
    console.error('[Update Storyboard Media]', error);
    res.status(500).json({ message: '保存失败: ' + error.message });
  }
});

module.exports = router;