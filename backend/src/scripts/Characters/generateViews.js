const { generationStartService, sendGenerationError } = require('../../modules/generation');
const { authMiddleware } = require('../../middleware');

// POST /:id/generate-views - 生成角色三视图提示词
module.exports = (router) => {
  router.post('/:id/generate-views', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const characterId = Number(req.params.id);

    try {
      const result = await generationStartService.start({
        operationKey: 'character_views_generate',
        rawInput: {
          characterId,
          ...req.body
        },
        actor: { userId }
      });

      res.json(result.response || {
        message: '三视图生成已启动',
        jobId: result.jobId,
        characterId,
        status: 'generating'
      });
    } catch (error) {
      sendGenerationError(res, error, '生成三视图失败', '[Generate Character Views]');
    }
  });
};
