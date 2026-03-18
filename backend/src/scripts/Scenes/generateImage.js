const { generationStartService, sendGenerationError } = require('../../modules/generation');
const { authMiddleware } = require('../../middleware');

// POST /:id/generate-image - 生成场景图片
module.exports = (router) => {
  router.post('/:id/generate-image', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const sceneId = Number(req.params.id);

    try {
      const result = await generationStartService.start({
        operationKey: 'scene_image_generate',
        rawInput: {
          sceneId,
          ...req.body
        },
        actor: { userId }
      });

      res.json(result.response || {
        message: '场景图片生成已启动',
        jobId: result.jobId,
        sceneId,
        status: 'generating'
      });
    } catch (error) {
      sendGenerationError(res, error, '生成场景图片失败', '[Generate Scene Image]');
    }
  });
};
