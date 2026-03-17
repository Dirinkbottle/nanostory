/**
 * 批量分镜生成 API
 * 将剧本解析为多个场景，创建单一整合任务进行处理
 * 
 * 特点：
 * - 用户界面只显示一个统一任务
 * - 后台按场景分割顺序处理
 * - 统一进度反馈
 * - 结果一次性保存
 * 
 * POST /auto-generate-by-scene/:scriptId
 */

const { queryOne, queryAll, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');
const { parseScriptScenes, getSceneCount } = require('../../utils/parseScriptScenes');

module.exports = (router) => {
  /**
   * 批量分镜生成（整合版）
   * 解析剧本中的各个场景，创建单一工作流任务处理所有场景
   */
  router.post('/auto-generate-by-scene/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);
    const { textModel, clearExisting = true } = req.body || {};

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

      // 预解析场景数量（不实际处理，只是为了返回场景数）
      const totalScenes = getSceneCount(script.content);
      
      if (totalScenes === 0) {
        return res.status(400).json({ message: '未能从剧本中识别出场景' });
      }

      console.log(`[BatchStoryboard] 识别到 ${totalScenes} 个场景，启动整合任务`);

      const engine = require('../../nosyntask/engine/index');

      // 创建单一的批量分镜生成任务
      const result = await engine.startWorkflow('batch_storyboard_generation', {
        userId,
        projectId,
        workflowName: `第${script.episode_number}集 分镜生成`,
        jobParams: {
          scriptId,
          projectId,
          userId,
          textModel,
          clearExisting,
          episodeNumber: script.episode_number,
          scriptContent: script.content  // 用于角色提取步骤
        }
      });

      console.log(`[BatchStoryboard] 任务已创建: jobId=${result.jobId}`);

      res.json({
        message: `已启动分镜生成（共 ${totalScenes} 个场景）`,
        scriptId,
        totalScenes,
        jobId: result.jobId
      });
    } catch (error) {
      console.error('[BatchStoryboard]', error);
      res.status(500).json({ message: '启动分镜生成失败: ' + error.message });
    }
  });

  /**
   * 获取场景解析预览（不启动任务，只返回场景列表）
   */
  router.get('/preview-scenes/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);

    try {
      const script = await queryOne(
        'SELECT * FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在' });
      }

      if (!script.content || script.content.trim() === '') {
        return res.status(400).json({ message: '剧本内容为空' });
      }

      const scenes = parseScriptScenes(script.content);

      res.json({
        scriptId,
        totalScenes: scenes.length,
        scenes: scenes.map(s => ({
          sceneNumber: s.sceneNumber,
          sceneName: s.sceneName,
          contentLength: s.content.length,
          preview: s.content.substring(0, 200) + (s.content.length > 200 ? '...' : '')
        }))
      });
    } catch (error) {
      console.error('[PreviewScenes]', error);
      res.status(500).json({ message: '解析场景失败: ' + error.message });
    }
  });
};
