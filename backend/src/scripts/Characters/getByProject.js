const { queryAll } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// GET /project/:projectId - 获取项目的所有角色
module.exports = (router) => {
  router.get('/project/:projectId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.params;

    try {
      const characters = await queryAll(
        'SELECT * FROM characters WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC',
        [projectId, userId]
      );

      console.log('[Characters by Project] projectId:', projectId, '找到', characters.length, '个角色');

      res.json({ characters });
    } catch (error) {
      console.error('[Characters by Project]', error);
      res.status(500).json({ message: '获取项目角色失败' });
    }
  });
};
