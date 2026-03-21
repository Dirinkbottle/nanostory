/**
 * 角色状态管理 API
 * 端点:
 * - GET /api/characters/:id/states - 获取角色的所有状态
 * - POST /api/characters/:id/states - 创建新状态
 * - PUT /api/characters/:id/states/:stateId - 更新状态
 * - DELETE /api/characters/:id/states/:stateId - 删除状态
 */
const { queryOne, queryAll, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

module.exports = (router) => {
  // GET /api/characters/:id/states - 获取角色的所有状态
  router.get('/:id/states', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      // 验证角色所有权
      const character = await queryOne(
        'SELECT id FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在或无权访问' });
      }

      const states = await queryAll(
        'SELECT * FROM character_states WHERE character_id = ? ORDER BY sort_order ASC, created_at ASC',
        [id]
      );

      res.json({ states });
    } catch (error) {
      console.error('[Get Character States]', error);
      res.status(500).json({ message: '获取角色状态失败' });
    }
  });

  // POST /api/characters/:id/states - 创建新状态
  router.post('/:id/states', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, appearance, image_url, front_view_url, side_view_url, back_view_url, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '状态名称不能为空' });
    }

    try {
      // 验证角色所有权
      const character = await queryOne(
        'SELECT id, name FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在或无权访问' });
      }

      // 获取当前最大排序值
      const maxOrder = await queryOne(
        'SELECT MAX(sort_order) as max_order FROM character_states WHERE character_id = ?',
        [id]
      );
      const newSortOrder = sort_order !== undefined ? sort_order : (maxOrder?.max_order || 0) + 1;

      const result = await execute(
        `INSERT INTO character_states (character_id, name, description, appearance, image_url, front_view_url, side_view_url, back_view_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name.trim(), description || '', appearance || '', image_url || '', front_view_url || '', side_view_url || '', back_view_url || '', newSortOrder]
      );

      const state = await queryOne('SELECT * FROM character_states WHERE id = ?', [result.insertId]);
      res.status(201).json({ message: '状态创建成功', state });
    } catch (error) {
      console.error('[Create Character State]', error);
      res.status(500).json({ message: '创建角色状态失败' });
    }
  });

  // PUT /api/characters/:id/states/:stateId - 更新状态
  router.put('/:id/states/:stateId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id, stateId } = req.params;
    const { name, description, appearance, image_url, front_view_url, side_view_url, back_view_url, sort_order } = req.body;

    try {
      // 验证角色所有权
      const character = await queryOne(
        'SELECT id FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在或无权访问' });
      }

      // 验证状态存在且属于该角色
      const existingState = await queryOne(
        'SELECT * FROM character_states WHERE id = ? AND character_id = ?',
        [stateId, id]
      );

      if (!existingState) {
        return res.status(404).json({ message: '状态不存在' });
      }

      await execute(
        `UPDATE character_states 
         SET name = ?, description = ?, appearance = ?, image_url = ?, front_view_url = ?, side_view_url = ?, back_view_url = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          name !== undefined ? name.trim() : existingState.name,
          description !== undefined ? description : existingState.description,
          appearance !== undefined ? appearance : existingState.appearance,
          image_url !== undefined ? image_url : existingState.image_url,
          front_view_url !== undefined ? front_view_url : existingState.front_view_url,
          side_view_url !== undefined ? side_view_url : existingState.side_view_url,
          back_view_url !== undefined ? back_view_url : existingState.back_view_url,
          sort_order !== undefined ? sort_order : existingState.sort_order,
          stateId
        ]
      );

      const state = await queryOne('SELECT * FROM character_states WHERE id = ?', [stateId]);
      res.json({ message: '状态更新成功', state });
    } catch (error) {
      console.error('[Update Character State]', error);
      res.status(500).json({ message: '更新角色状态失败' });
    }
  });

  // DELETE /api/characters/:id/states/:stateId - 删除状态
  router.delete('/:id/states/:stateId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id, stateId } = req.params;

    try {
      // 验证角色所有权
      const character = await queryOne(
        'SELECT id FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在或无权访问' });
      }

      // 验证状态存在且属于该角色
      const existingState = await queryOne(
        'SELECT id FROM character_states WHERE id = ? AND character_id = ?',
        [stateId, id]
      );

      if (!existingState) {
        return res.status(404).json({ message: '状态不存在' });
      }

      // 删除状态（关联的参考图会通过外键级联删除，如果设置了级联）
      await execute('DELETE FROM character_states WHERE id = ?', [stateId]);
      res.json({ message: '状态删除成功' });
    } catch (error) {
      console.error('[Delete Character State]', error);
      res.status(500).json({ message: '删除角色状态失败' });
    }
  });
};
