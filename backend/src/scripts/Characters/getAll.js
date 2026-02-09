const { queryAll } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// GET / - 获取所有角色
module.exports = (router) => {
  router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
      const characters = await queryAll(
        `SELECT c.*, p.name AS project_name 
         FROM characters c 
         LEFT JOIN projects p ON c.project_id = p.id 
         WHERE c.user_id = ? 
         ORDER BY c.created_at DESC`,
        [userId]
      );

      res.json({ characters });
    } catch (error) {
      console.error('[Characters List]', error);
      res.status(500).json({ message: '获取角色列表失败' });
    }
  });
};
