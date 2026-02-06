const { queryOne } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// GET /:id - 获取单个角色
module.exports = (router) => {
  router.get('/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const character = await queryOne(
        'SELECT * FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在' });
      }

      res.json(character);
    } catch (error) {
      console.error('[Character Detail]', error);
      res.status(500).json({ message: '获取角色失败' });
    }
  });
};
