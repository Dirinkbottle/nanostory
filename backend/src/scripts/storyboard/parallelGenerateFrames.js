/**
 * POST /parallel-generate-frames/:scriptId
 * 并发生成一集所有分镜的首尾帧（独立模式，不依赖链式传递）
 * 
 * 与 batch-generate-frames 的区别：
 *   1. 每个分镜独立生成，不依赖其他分镜的尾帧
 *   2. 支持真正的并发处理，效率更高
 *   3. 适合对连贯性要求不高的场景
 */

const { authMiddleware } = require('../../middleware');
const { generationStartService, sendGenerationError } = require('../../modules/generation');

module.exports = (router) => {
  router.post('/parallel-generate-frames/:scriptId', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const scriptId = Number(req.params.scriptId);
      const { 
        imageModel, 
        aspectRatio,
        textModel, 
        overwriteFrames = false, 
        maxConcurrency = 5  // 默认并发数
      } = req.body;

      if (!scriptId) {
        return res.status(400).json({ message: '缺少 scriptId' });
      }
      if (!imageModel) {
        return res.status(400).json({ message: '缺少 imageModel（图片模型）' });
      }

      console.log(`[ParallelGenerateFrames] 用户 ${userId} 请求并发生成，scriptId=${scriptId}, 并发=${maxConcurrency}, 覆盖=${overwriteFrames}`);

      const result = await generationStartService.start({
        operationKey: 'parallel_frame_generate',
        rawInput: {
          scriptId,
          imageModel,
          aspectRatio: aspectRatio || null,
          textModel: textModel || null,
          overwriteFrames: !!overwriteFrames,
          maxConcurrency: Number(maxConcurrency) || 5
        },
        actor: { userId }
      });
      const { jobId, tasks } = result;

      res.json(result.response || {
        success: true,
        jobId,
        tasks,
        message: '并发帧生成任务已启动（独立模式）'
      });
    } catch (error) {
      sendGenerationError(res, error, '启动并发生成失败', '[ParallelGenerateFrames]');
    }
  });
};
