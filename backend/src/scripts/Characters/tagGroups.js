const { queryAll, queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

/**
 * 角色标签分组API
 * 
 * GET    /tag-groups          获取当前用户的所有标签分组
 * POST   /tag-groups          创建标签分组
 * PUT    /tag-groups/:id      更新标签分组
 * DELETE /tag-groups/:id      删除标签分组
 */
module.exports = (router) => {
  // GET /tag-groups - 获取当前用户的所有标签分组
  router.get('/tag-groups', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
      const tagGroups = await queryAll(
        `SELECT * FROM character_tag_groups 
         WHERE user_id = ? 
         ORDER BY sort_order ASC, created_at ASC`,
        [userId]
      );

      res.json({ tagGroups });
    } catch (error) {
      console.error('[Tag Groups List]', error);
      res.status(500).json({ message: '获取标签分组列表失败' });
    }
  });

  // POST /tag-groups - 创建标签分组
  router.post('/tag-groups', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, color, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '分组名称不能为空' });
    }

    try {
      // 检查是否已存在同名分组
      const existing = await queryOne(
        'SELECT id FROM character_tag_groups WHERE user_id = ? AND name = ?',
        [userId, name.trim()]
      );

      if (existing) {
        return res.status(400).json({ message: '已存在同名分组' });
      }

      const result = await execute(
        `INSERT INTO character_tag_groups (user_id, name, color, sort_order) 
         VALUES (?, ?, ?, ?)`,
        [userId, name.trim(), color || '#6366f1', sort_order || 0]
      );

      const tagGroup = await queryOne(
        'SELECT * FROM character_tag_groups WHERE id = ?',
        [result.insertId]
      );

      res.json({ message: '标签分组创建成功', tagGroup });
    } catch (error) {
      console.error('[Tag Groups Create]', error);
      res.status(500).json({ message: '创建标签分组失败' });
    }
  });

  // PUT /tag-groups/:id - 更新标签分组
  router.put('/tag-groups/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, color, sort_order } = req.body;

    try {
      const existing = await queryOne(
        'SELECT * FROM character_tag_groups WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existing) {
        return res.status(404).json({ message: '标签分组不存在' });
      }

      // 如果改名，检查是否与其他分组重名
      if (name && name.trim() !== existing.name) {
        const duplicate = await queryOne(
          'SELECT id FROM character_tag_groups WHERE user_id = ? AND name = ? AND id != ?',
          [userId, name.trim(), id]
        );

        if (duplicate) {
          return res.status(400).json({ message: '已存在同名分组' });
        }
      }

      await execute(
        `UPDATE character_tag_groups 
         SET name = ?, color = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          name ? name.trim() : existing.name,
          color !== undefined ? color : existing.color,
          sort_order !== undefined ? sort_order : existing.sort_order,
          id,
          userId
        ]
      );

      const tagGroup = await queryOne(
        'SELECT * FROM character_tag_groups WHERE id = ?',
        [id]
      );

      res.json({ message: '标签分组更新成功', tagGroup });
    } catch (error) {
      console.error('[Tag Groups Update]', error);
      res.status(500).json({ message: '更新标签分组失败' });
    }
  });

  // DELETE /tag-groups/:id - 删除标签分组
  router.delete('/tag-groups/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const existing = await queryOne(
        'SELECT * FROM character_tag_groups WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existing) {
        return res.status(404).json({ message: '标签分组不存在' });
      }

      await execute(
        'DELETE FROM character_tag_groups WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      res.json({ message: '标签分组删除成功' });
    } catch (error) {
      console.error('[Tag Groups Delete]', error);
      res.status(500).json({ message: '删除标签分组失败' });
    }
  });
};
