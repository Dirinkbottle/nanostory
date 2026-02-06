const { queryAll } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// GET / - 获取所有角色
module.exports = (router) => {
  router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
      const characters = await queryAll(
        'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      res.json({ characters });
    } catch (error) {
      console.error('[Characters List]', error);
      res.status(500).json({ message: '获取角色列表失败' });
    }
  });
};
