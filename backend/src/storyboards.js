const express = require('express');
const { queryOne, queryAll, execute } = require('./dbHelper');
const { authMiddleware } = require('./middleware');

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

router.get('/:scriptId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);

  if (!scriptId) {
    return res.status(400).json({ message: 'Invalid script id' });
  }

  try {
    const script = queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1', [scriptId, userId]);

    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    const rows = queryAll('SELECT id, idx, prompt_template, variables_json, image_ref, created_at FROM storyboards WHERE script_id = ? ORDER BY idx ASC', [scriptId]);

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

router.post('/:scriptId', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);
  const { items } = req.body || {};

  if (!scriptId || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  try {
    const script = queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1', [scriptId, userId]);

    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);

    items.forEach((item, idx) => {
      const index = typeof item.index === 'number' ? item.index : idx + 1;
      const promptTemplate = item.prompt_template || '';
      const variablesJson = JSON.stringify(item.variables || {});
      const imageRef = item.image_ref || null;

      execute('INSERT INTO storyboards (script_id, idx, prompt_template, variables_json, image_ref) VALUES (?, ?, ?, ?, ?)', [scriptId, index, promptTemplate, variablesJson, imageRef]);
    });

    return res.json({ message: 'Storyboards saved' });
  } catch (err) {
    console.error('DB error saving storyboards:', err);
    return res.status(500).json({ message: 'Failed to save storyboards' });
  }
});

module.exports = router;
