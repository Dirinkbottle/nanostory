/**
 * POST /batch-generate-frames/:scriptId
 * 一键生成一集所有分镜的首帧/首尾帧图片
 */

const { authMiddleware } = require('../../middleware');
const workflowEngine = require('../../nosyntask/engine');
const { queryOne } = require('../../dbHelper');

module.exports = (router) => {
  router.post('/batch-generate-frames/:scriptId', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { scriptId } = req.params;
      const { imageModel, textModel, overwriteFrames = false, projectId } = req.body;

      if (!scriptId) {
        return res.status(400).json({ message: '缺少 scriptId' });
      }
      if (!imageModel) {
        return res.status(400).json({ message: '缺少 imageModel（图片模型）' });
      }

      console.log(`[BatchGenerateFrames] 用户 ${userId} 请求批量生成，scriptId=${scriptId}, 覆盖=${overwriteFrames}`);

      // 获取剧本信息（集数）
      const script = await queryOne('SELECT episode_number FROM scripts WHERE id = ?', [scriptId]);
      const episodeNumber = script?.episode_number || null;

      const { jobId, tasks } = await workflowEngine.startWorkflow('batch_frame_generation', {
        userId,
        projectId: projectId || null,
        jobParams: {
          scriptId: Number(scriptId),
          episodeNumber,
          imageModel,
          textModel: textModel || null,
          overwriteFrames: !!overwriteFrames
        }
      });

      res.json({
        success: true,
        jobId,
        tasks,
        message: '批量帧生成任务已启动'
      });
    } catch (error) {
      console.error('[BatchGenerateFrames] 启动失败:', error);
      res.status(500).json({ message: error.message || '启动批量生成失败' });
    }
  });
};
