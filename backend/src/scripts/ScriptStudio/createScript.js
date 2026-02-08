/**
 * POST /api/scripts/create
 * 手动创建剧本（非 AI 生成）
 */

const { queryOne, execute, getLastInsertId } = require('../../dbHelper');

async function createScript(req, res) {
  const { projectId, title, content, episodeNumber } = req.body || {};
  const userId = req.user.id;

  if (!projectId) {
    return res.status(400).json({ message: '缺少项目ID' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ message: '剧本内容不能为空' });
  }

  try {
    // 验证项目归属
    const project = await queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    // 确定集数
    let targetEpisode = episodeNumber;
    if (!targetEpisode) {
      const lastEpisode = await queryOne(
        'SELECT MAX(episode_number) as max_ep FROM scripts WHERE project_id = ?',
        [projectId]
      );
      targetEpisode = (lastEpisode?.max_ep || 0) + 1;
    }

    // 检查该集是否已存在
    const existing = await queryOne(
      'SELECT id FROM scripts WHERE project_id = ? AND episode_number = ?',
      [projectId, targetEpisode]
    );
    if (existing) {
      return res.status(400).json({ message: `第${targetEpisode}集已存在，请编辑或删除后重试` });
    }

    // 插入剧本记录
    await execute(
      'INSERT INTO scripts (user_id, project_id, episode_number, title, content, status, model_provider, token_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, projectId, targetEpisode, title || `第${targetEpisode}集`, content, 'completed', 'manual', 0]
    );
    const scriptId = await getLastInsertId();

    res.json({
      success: true,
      scriptId,
      episodeNumber: targetEpisode,
      message: `第${targetEpisode}集剧本保存成功`
    });
  } catch (error) {
    console.error('[Create Script]', error);
    res.status(500).json({ message: '创建剧本失败：' + error.message });
  }
}

module.exports = createScript;
