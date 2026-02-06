/**
 * GET /api/scripts/project/:projectId/episode/:episodeNumber
 * 获取指定集的剧本
 */

const { queryOne } = require('../../dbHelper');

async function getEpisode(req, res) {
  const userId = req.user.id;
  const { projectId, episodeNumber } = req.params;

  try {
    const project = await queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    const script = await queryOne(
      `SELECT id, episode_number, title, content, model_provider, token_used, status, created_at, updated_at 
       FROM scripts WHERE project_id = ? AND episode_number = ? AND user_id = ?`,
      [projectId, episodeNumber, userId]
    );

    return res.json({ script });
  } catch (err) {
    console.error('DB error fetching episode:', err);
    return res.status(500).json({ message: '获取剧本失败' });
  }
}

module.exports = getEpisode;
