/**
 * PUT /api/scripts/:id
 * 更新剧本
 */

const { queryOne, execute } = require('../../dbHelper');

async function updateScript(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, content } = req.body;

  if (!content) {
    return res.status(400).json({ message: '剧本内容不能为空' });
  }

  try {
    // 验证剧本归属
    const script = await queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!script) {
      return res.status(404).json({ message: '剧本不存在或无权访问' });
    }

    // 更新剧本
    await execute(
      'UPDATE scripts SET title = ?, content = ? WHERE id = ? AND user_id = ?',
      [title || null, content, id, userId]
    );

    return res.json({ message: '剧本保存成功' });
  } catch (err) {
    console.error('DB error updating script:', err);
    return res.status(500).json({ message: '保存剧本失败' });
  }
}

module.exports = updateScript;
