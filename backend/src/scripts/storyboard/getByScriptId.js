const { queryOne, queryAll } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// GET /:scriptId - 获取指定剧本的所有分镜
module.exports = (router) => {
  router.get('/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);

    try {
      // 验证剧本权限
      const script = await queryOne(
        'SELECT * FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在或无权访问' });
      }

      // 获取分镜
      const storyboards = await queryAll(
        'SELECT * FROM storyboards WHERE script_id = ? ORDER BY idx ASC',
        [scriptId]
      );

      // 解析 variables_json
      const parsed = storyboards.map(sb => ({
        ...sb,
        variables: sb.variables_json ? JSON.parse(sb.variables_json) : {}
      }));

      res.json(parsed);
    } catch (error) {
      console.error('[Get Storyboards]', error);
      res.status(500).json({ message: '获取分镜失败' });
    }
  });
};
