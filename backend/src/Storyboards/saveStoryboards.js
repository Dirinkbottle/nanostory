/**
 * POST /api/storyboards/:scriptId
 * 保存/更新分镜列表
 */

const { queryOne, execute } = require('../dbHelper');

async function saveStoryboards(req, res) {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);
  const { items } = req.body || {};

  if (!scriptId || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const script = await queryOne('SELECT id, project_id FROM scripts WHERE id = ? AND user_id = ?', [scriptId, userId]);
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);

    for (const item of items) {
      await execute(
        'INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json) VALUES (?, ?, ?, ?, ?)',
        [script.project_id, scriptId, item.idx || 0, item.prompt_template || '', JSON.stringify(item.variables_json || {})]
      );
    }

    res.json({ message: 'Storyboards saved' });
  } catch (err) {
    console.error('DB error saving storyboards:', err);
    res.status(500).json({ message: 'Failed to save storyboards' });
  }
}

module.exports = saveStoryboards;
