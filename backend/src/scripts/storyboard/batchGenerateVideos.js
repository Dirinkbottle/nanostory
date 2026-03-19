/**
 * POST /batch-generate-videos/:scriptId
 * 一键生成一集所有分镜的视频
 */

const { authMiddleware } = require('../../middleware');
const { generationStartService, sendGenerationError } = require('../../modules/generation');

module.exports = (router) => {
  router.post('/batch-generate-videos/:scriptId', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const scriptId = Number(req.params.scriptId);
      const { videoModel, textModel, duration, overwriteVideos = false, aspectRatio, validSceneIds } = req.body;

      if (!scriptId) {
        return res.status(400).json({ message: '缺少 scriptId' });
      }
      if (!videoModel) {
        return res.status(400).json({ message: '缺少 videoModel（视频模型）' });
      }

      console.log(`[BatchGenerateVideos] 用户 ${userId} 请求批量生成视频，scriptId=${scriptId}, 覆盖=${overwriteVideos}`);

      const result = await generationStartService.start({
        operationKey: 'batch_scene_video_generate',
        rawInput: {
          scriptId,
          videoModel,
          textModel,
          duration: duration ?? null,
          aspectRatio: aspectRatio || null,
          overwriteVideos: !!overwriteVideos,
          validSceneIds: Array.isArray(validSceneIds) && validSceneIds.length > 0 ? validSceneIds : undefined
        },
        actor: { userId }
      });
      const { jobId, tasks } = result;

      res.json(result.response || {
        success: true,
        jobId,
        tasks,
        message: '批量视频生成任务已启动'
      });
    } catch (error) {
      sendGenerationError(res, error, '启动批量视频生成失败', '[BatchGenerateVideos]');
    }
  });
};
