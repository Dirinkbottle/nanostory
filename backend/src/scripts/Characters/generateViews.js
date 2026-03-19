const { generationStartService, sendGenerationError } = require('../../modules/generation');
const { authMiddleware } = require('../../middleware');
const { queryOne } = require('../../dbHelper');

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

  // GET /:id/generation-status - 查询三视图生成状态
  router.get('/:id/generation-status', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const characterId = Number(req.params.id);

    try {
      const character = await queryOne(
        'SELECT generation_status, front_view_url, side_view_url, back_view_url FROM characters WHERE id = ? AND user_id = ?',
        [characterId, userId]
      );

      if (!character) {
        return res.status(404).json({ message: '角色不存在' });
      }

      // 计算进度：根据已生成的视图数量
      let progress = '';
      if (character.generation_status === 'generating') {
        const viewsCount = [character.front_view_url, character.side_view_url, character.back_view_url].filter(Boolean).length;
        progress = `${viewsCount}/3`;
      }

      res.json({
        status: character.generation_status || 'idle',
        progress
      });
    } catch (error) {
      console.error('[Generation Status] 查询失败:', error);
      res.status(500).json({ message: '查询生成状态失败' });
    }
  });
};
