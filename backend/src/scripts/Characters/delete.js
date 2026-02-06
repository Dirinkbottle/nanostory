const { queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// DELETE /:id - 删除角色
module.exports = (router) => {
  router.delete('/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const existing = await queryOne(
        'SELECT * FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existing) {
        return res.status(404).json({ message: '角色不存在' });
      }

      await execute('DELETE FROM characters WHERE id = ? AND user_id = ?', [id, userId]);
      res.json({ message: '角色删除成功' });
    } catch (error) {
      console.error('[Character Delete]', error);
      res.status(500).json({ message: '删除角色失败' });
    }
  });
};
