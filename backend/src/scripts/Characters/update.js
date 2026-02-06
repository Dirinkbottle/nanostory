const { queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// PUT /:id - 更新角色
module.exports = (router) => {
  router.put('/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, appearance, personality, image_url, tags } = req.body;

    try {
      const existing = await queryOne(
        'SELECT * FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existing) {
        return res.status(404).json({ message: '角色不存在' });
      }

      await execute(
        `UPDATE characters 
         SET name = ?, description = ?, appearance = ?, personality = ?, image_url = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          name || existing.name,
          description !== undefined ? description : existing.description,
          appearance !== undefined ? appearance : existing.appearance,
          personality !== undefined ? personality : existing.personality,
          image_url !== undefined ? image_url : existing.image_url,
          tags !== undefined ? tags : existing.tags,
          id,
          userId
        ]
      );

      const updated = await queryOne('SELECT * FROM characters WHERE id = ?', [id]);
      res.json({ message: '角色更新成功', character: updated });
    } catch (error) {
      console.error('[Character Update]', error);
      res.status(500).json({ message: '更新角色失败' });
    }
  });
};
