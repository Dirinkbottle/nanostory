/**
 * GET /api/scripts/project/:projectId
 * 获取指定项目的所有剧本（多集）
 */

const { queryOne, queryAll } = require('../../dbHelper');

async function getProjectScripts(req, res) {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    // 验证项目归属
    const project = await queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    // 获取项目的所有剧本（按集数排序）
    const scripts = await queryAll(
      `SELECT id, episode_number, title, content, model_provider, token_used, status, created_at, updated_at 
       FROM scripts WHERE project_id = ? AND user_id = ? 
       ORDER BY episode_number ASC`,
      [projectId, userId]
    );

    // 返回剧本列表和当前选中的剧本（默认第一集）
    const currentScript = scripts.length > 0 ? scripts[0] : null;

    return res.json({ 
      scripts,
      script: currentScript,
      totalEpisodes: scripts.length,
      nextEpisode: scripts.length + 1
    });
  } catch (err) {
    console.error('DB error fetching scripts:', err);
    return res.status(500).json({ message: '获取剧本失败' });
  }
}

module.exports = getProjectScripts;
