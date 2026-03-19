/**
 * 草稿剧本 API
 * POST /api/scripts/draft - 创建或更新草稿
 * PUT /api/scripts/draft/:scriptId - 保存草稿内容
 * DELETE /api/scripts/draft/:scriptId - 删除草稿
 */

const { queryOne, execute } = require('../../dbHelper');

/**
 * 创建或更新草稿剧本
 */
async function createOrUpdateDraft(req, res) {
  const userId = req.user.id;
  const { projectId, episodeNumber, title, description, length, content } = req.body;

  if (!projectId || !episodeNumber) {
    return res.status(400).json({ message: '缺少项目ID或集数' });
  }

  try {
    // 验证项目归属
    const project = await queryOne(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    // 检查是否已存在该集的记录
    const existing = await queryOne(
      'SELECT id, status FROM scripts WHERE project_id = ? AND episode_number = ?',
      [projectId, episodeNumber]
    );

    if (existing) {
      // 如果已存在且是草稿状态，更新它
      if (existing.status === 'draft') {
        await execute(
          `UPDATE scripts SET title = ?, content = ?, draft_description = ?, draft_length = ?, updated_at = NOW() 
           WHERE id = ?`,
          [title || `第${episodeNumber}集`, content || '', description || '', length || '短篇', existing.id]
        );
        return res.json({
          scriptId: existing.id,
          episodeNumber,
          status: 'draft',
          message: '草稿已保存'
        });
      } else {
        // 已存在非草稿状态的记录，不允许创建草稿
        return res.status(400).json({ 
          message: `第${episodeNumber}集已存在（状态：${existing.status}）` 
        });
      }
    }

    // 创建新的草稿记录
    const result = await execute(
      `INSERT INTO scripts (user_id, project_id, episode_number, title, content, draft_description, draft_length, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [userId, projectId, episodeNumber, title || `第${episodeNumber}集`, content || '', description || '', length || '短篇']
    );

    return res.json({
      scriptId: result.insertId,
      episodeNumber,
      status: 'draft',
      message: '草稿已创建'
    });
  } catch (err) {
    console.error('[Draft] 创建/更新草稿失败:', err);
    return res.status(500).json({ message: '操作失败' });
  }
}

/**
 * 保存草稿内容
 * PUT /api/scripts/draft/:scriptId
 * 故事走向就是草稿内容，content 和 draft_description 同步存储
 */
async function saveDraftContent(req, res) {
  const userId = req.user.id;
  const { scriptId } = req.params;
  const { title, content, description, length } = req.body;

  // 故事走向就是草稿内容，同步存储到 content 和 draft_description
  const draftContent = content || description || '';

  try {
    // 验证草稿归属和状态
    const script = await queryOne(
      'SELECT id, status, project_id FROM scripts WHERE id = ? AND user_id = ?',
      [scriptId, userId]
    );

    if (!script) {
      return res.status(404).json({ message: '草稿不存在或无权访问' });
    }

    if (script.status !== 'draft') {
      return res.status(400).json({ message: '只能保存草稿状态的剧本' });
    }

    // 更新草稿内容 - content 和 draft_description 同步
    await execute(
      `UPDATE scripts SET 
        title = COALESCE(?, title), 
        content = ?, 
        draft_description = ?, 
        draft_length = COALESCE(?, draft_length), 
        updated_at = NOW() 
       WHERE id = ?`,
      [title, draftContent, draftContent, length, scriptId]
    );

    return res.json({ 
      success: true,
      message: '草稿已保存',
      savedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Draft] 保存草稿内容失败:', err);
    return res.status(500).json({ message: '保存失败' });
  }
}

/**
 * 删除草稿剧本
 */
async function deleteDraft(req, res) {
  const userId = req.user.id;
  const { scriptId } = req.params;

  try {
    // 验证草稿归属和状态
    const script = await queryOne(
      'SELECT id, status FROM scripts WHERE id = ? AND user_id = ?',
      [scriptId, userId]
    );

    if (!script) {
      return res.status(404).json({ message: '草稿不存在或无权访问' });
    }

    if (script.status !== 'draft') {
      return res.status(400).json({ message: '只能删除草稿状态的剧本' });
    }

    await execute('DELETE FROM scripts WHERE id = ?', [scriptId]);

    return res.json({ message: '草稿已删除' });
  } catch (err) {
    console.error('[Draft] 删除草稿失败:', err);
    return res.status(500).json({ message: '删除失败' });
  }
}

module.exports = {
  createOrUpdateDraft,
  saveDraftContent,
  deleteDraft
};
