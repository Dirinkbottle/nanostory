/**
 * POST /batch-generate-videos/:scriptId
 * 一键生成一集所有分镜的视频
 */

const { authMiddleware } = require('../../middleware');
const workflowEngine = require('../../nosyntask/engine');

module.exports = (router) => {
  router.post('/batch-generate-videos/:scriptId', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { scriptId } = req.params;
      const { videoModel, textModel, duration, overwriteVideos = false, projectId } = req.body;

      if (!scriptId) {
        return res.status(400).json({ message: '缺少 scriptId' });
      }
      if (!videoModel) {
        return res.status(400).json({ message: '缺少 videoModel（视频模型）' });
      }

      console.log(`[BatchGenerateVideos] 用户 ${userId} 请求批量生成视频，scriptId=${scriptId}, 覆盖=${overwriteVideos}`);

      const { jobId, tasks } = await workflowEngine.startWorkflow('batch_scene_video_generation', {
        userId,
        projectId: projectId || null,
        jobParams: {
          scriptId: Number(scriptId),
          videoModel,
          textModel: textModel || null,
          duration: duration || null,
          overwriteVideos: !!overwriteVideos
        }
      });

      res.json({
        success: true,
        jobId,
        tasks,
        message: '批量视频生成任务已启动'
      });
    } catch (error) {
      console.error('[BatchGenerateVideos] 启动失败:', error);
      res.status(500).json({ message: error.message || '启动批量视频生成失败' });
    }
  });
};
