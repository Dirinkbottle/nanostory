/**
 * PATCH /storyboards/:storyboardId/director-params
 * 更新单个分镜的导演参数
 */

const { authMiddleware } = require('../../middleware');
const { queryOne, execute } = require('../../dbHelper');

module.exports = (router) => {
  router.patch('/:storyboardId/director-params', authMiddleware, async (req, res) => {
    try {
      const { storyboardId } = req.params;
      const { directorParams } = req.body;

      if (!storyboardId) {
        return res.status(400).json({ message: '缺少 storyboardId' });
      }

      // 查询当前分镜的 variables_json
      const storyboard = await queryOne(
        'SELECT id, variables_json FROM storyboards WHERE id = ?',
        [storyboardId]
      );

      if (!storyboard) {
        return res.status(404).json({ message: '分镜不存在' });
      }

      // 解析现有的 variables_json
      let vars = {};
      try {
        vars = typeof storyboard.variables_json === 'string'
          ? JSON.parse(storyboard.variables_json || '{}')
          : (storyboard.variables_json || {});
      } catch (e) {
        vars = {};
      }

      // 更新 directorParams
      vars.directorParams = directorParams;

      // 保存到数据库
      await execute(
        'UPDATE storyboards SET variables_json = ? WHERE id = ?',
        [JSON.stringify(vars), storyboardId]
      );

      console.log(`[DirectorParams] 分镜 ${storyboardId} 导演参数已更新`);

      res.json({
        success: true,
        message: '导演参数已保存'
      });
    } catch (error) {
      console.error('[DirectorParams] 保存失败:', error);
      res.status(500).json({ message: error.message || '保存导演参数失败' });
    }
  });
};
