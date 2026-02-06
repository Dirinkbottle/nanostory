const { queryOne } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /:id/generate-image - 生成场景图片
module.exports = (router) => {
  router.post('/:id/generate-image', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { style, modelName, width, height } = req.body;

    try {
      const scene = await queryOne(
        'SELECT * FROM scenes WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!scene) {
        return res.status(404).json({ message: '场景不存在' });
      }

      // 参数验证：确保必要字段完整
      if (!scene.name && !scene.description && !scene.environment) {
        return res.status(400).json({ 
          message: '场景信息不足，至少需要提供场景名称、描述或环境描述之一' 
        });
      }

      // 启动异步工作流生成场景图片
      const engine = require('../../nosyntask/engine');
      const result = await engine.startWorkflow('scene_image_generation', {
        userId,
        projectId: scene.project_id,
        jobParams: {
          sceneId: id,
          sceneName: scene.name,
          description: scene.description,
          environment: scene.environment,
          lighting: scene.lighting,
          mood: scene.mood,
          style: style || '写实风格',
          modelName: modelName,
          width: width || 1024,
          height: height || 576
        }
      });

      console.log('[Generate Scene Image] 工作流创建成功:', result);

      res.json({
        message: '场景图片生成已启动',
        jobId: result.jobId,
        sceneId: id,
        status: 'generating'
      });
    } catch (error) {
      console.error('[Generate Scene Image]', error);
      res.status(500).json({ message: '生成场景图片失败: ' + error.message });
    }
  });
};
