const { queryOne, execute, getLastInsertId } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST / - 创建角色
module.exports = (router) => {
  router.post('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, description, appearance, personality, image_url, tags } = req.body;

    if (!name) {
      return res.status(400).json({ message: '角色名称不能为空' });
    }

    try {
      await execute(
        `INSERT INTO characters (user_id, name, description, appearance, personality, image_url, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, description || '', appearance || '', personality || '', image_url || '', tags || '']
      );

      const id = await getLastInsertId();
      const character = await queryOne('SELECT * FROM characters WHERE id = ?', [id]);

      res.json({ message: '角色创建成功', character });
    } catch (error) {
      console.error('[Character Create]', error);
      res.status(500).json({ message: '创建角色失败' });
    }
  });
};
