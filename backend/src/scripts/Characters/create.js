const { queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST / - 创建角色
module.exports = (router) => {
  router.post('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, description, appearance, personality, image_url, tags, tag_groups_json } = req.body;

    if (!name) {
      return res.status(400).json({ message: '角色名称不能为空' });
    }

    try {
      // 处理 tag_groups_json，确保是有效的 JSON 字符串
      let tagGroupsStr = null;
      if (tag_groups_json) {
        tagGroupsStr = typeof tag_groups_json === 'string' 
          ? tag_groups_json 
          : JSON.stringify(tag_groups_json);
      }

      const result = await execute(
        `INSERT INTO characters (user_id, name, description, appearance, personality, image_url, tags, tag_groups_json) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, description || '', appearance || '', personality || '', image_url || '', tags || '', tagGroupsStr]
      );

      const id = result.insertId;
      const character = await queryOne('SELECT * FROM characters WHERE id = ?', [id]);

      res.json({ message: '角色创建成功', character });
    } catch (error) {
      console.error('[Character Create]', error);
      res.status(500).json({ message: '创建角色失败' });
    }
  });
};
