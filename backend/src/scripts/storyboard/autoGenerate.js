const { queryOne } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /auto-generate/:scriptId - 根据剧本内容自动生成分镜（异步工作流）
module.exports = (router) => {
  router.post('/auto-generate/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);
    const { textModel } = req.body || {};

    if (!textModel) {
      return res.status(400).json({ message: '缺少模型名称，请选择一个文本模型' });
    }

    try {
      const script = await queryOne(
        'SELECT * FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在' });
      }

      if (!script.content || script.content.trim() === '') {
        return res.status(400).json({ message: '剧本内容为空，无法生成分镜' });
      }

      const projectId = script.project_id;

      // 使用工作流引擎生成分镜
      const engine = require('../../nosyntask/engine/index');
      const result = await engine.startWorkflow('storyboard_generation', {
        userId,
        projectId,
        jobParams: {
          scriptId,
          projectId,
          episodeNumber: script.episode_number,
          scriptContent: script.content,
          scriptTitle: script.title || `第${script.episode_number}集`,
          textModel
        }
      });

      res.json({
        message: '分镜生成已启动',
        jobId: result.jobId,
        scriptId
      });
    } catch (error) {
      console.error('[Auto Generate Storyboard]', error);
      res.status(500).json({ message: '启动分镜生成失败: ' + error.message });
    }
  });
};
