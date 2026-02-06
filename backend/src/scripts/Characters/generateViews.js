const { queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');
const { callAIModel } = require('../../aiModelService');

// POST /:id/generate-views - 生成角色三视图提示词
module.exports = (router) => {
  router.post('/:id/generate-views', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { style, modelName } = req.body;

    try {
      const character = await queryOne(
        'SELECT * FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在' });
      }

      // 启动异步工作流生成三视图
      const engine = require('../../nosyntask/engine');
      const result = await engine.startWorkflow('character_views_generation', {
        userId,
        projectId: character.project_id,
        jobParams: {
          characterId: id,
          characterName: character.name,
          appearance: character.appearance,
          personality: character.personality,
          description: character.description,
          style: style,
          modelName: modelName  // 从请求体中获取用户选择的模型
        }
      });

      console.log('[Generate Character Views] 工作流创建成功:', result);

      res.json({
        message: '三视图生成已启动',
        jobId: result.jobId,
        characterId: id,
        status: 'generating'
      });
    } catch (error) {
      console.error('[Generate Character Views]', error);
      res.status(500).json({ message: '生成三视图失败: ' + error.message });
    }
  });
};
