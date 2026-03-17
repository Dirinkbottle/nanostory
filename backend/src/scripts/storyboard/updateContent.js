/**
 * PATCH /api/storyboards/:storyboardId/content
 * 更新单个分镜的描述内容
 */

const { queryOne, execute } = require('../../dbHelper');

async function updateContent(req, res) {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);
  const { prompt_template } = req.body || {};

  if (!storyboardId) {
    return res.status(400).json({ message: 'Invalid storyboard id' });
  }

  if (typeof prompt_template !== 'string') {
    return res.status(400).json({ message: 'prompt_template 必须是字符串' });
  }

  try {
    const storyboard = await queryOne(
      `SELECT s.id
       FROM storyboards s
       JOIN scripts sc ON s.script_id = sc.id
       WHERE s.id = ? AND sc.user_id = ?`,
      [storyboardId, userId]
    );

    if (!storyboard) {
      return res.status(404).json({ message: 'Storyboard not found or access denied' });
    }

    await execute(
      'UPDATE storyboards SET prompt_template = ? WHERE id = ?',
      [prompt_template, storyboardId]
    );

    res.json({
      success: true,
      message: 'Content updated successfully'
    });
  } catch (error) {
    console.error('[Storyboard Content] 更新失败:', error);
    res.status(500).json({ message: 'Failed to update storyboard content' });
  }
}

module.exports = updateContent;
