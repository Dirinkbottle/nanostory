const { queryAll } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /extract-scenes/:scriptId - 手动提取场景
module.exports = (router) => {
  router.post('/extract-scenes/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);
    const { modelName } = req.body;

    try {
      console.log('[Extract Scenes] 提取场景:', { scriptId, userId, modelName });

      // 获取该剧本的所有分镜
      const storyboards = await queryAll(
        'SELECT * FROM storyboards WHERE script_id = ? ORDER BY idx',
        [scriptId]
      );

      if (!storyboards || storyboards.length === 0) {
        return res.status(404).json({ message: '该剧本没有分镜数据' });
      }

      // 获取剧本信息
      const { queryOne } = require('../../dbHelper');
      const script = await queryOne(
        'SELECT project_id, content FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在' });
      }

      // 将分镜数据转换为场景提取所需的格式
      const scenes = storyboards.map(sb => {
        let variables = {};
        try {
          variables = typeof sb.variables_json === 'string' 
            ? JSON.parse(sb.variables_json) 
            : sb.variables_json || {};
        } catch (e) {
          console.error('[Extract Scenes] 解析 variables_json 失败:', e);
        }

        return {
          description: sb.prompt_template,
          location: variables.location || '',
          emotion: variables.emotion || '',
          characters: variables.characters || [],
          dialogue: variables.dialogue || ''
        };
      });

      // 启动场景提取工作流
      const engine = require('../../nosyntask/engine');
      const result = await engine.startWorkflow('scene_extraction', {
        userId,
        projectId: script.project_id,
        jobParams: {
          scenes,
          scriptContent: script.content,
          projectId: script.project_id,
          scriptId,
          modelName: modelName || 'DeepSeek Chat'
        }
      });

      console.log('[Extract Scenes] 工作流创建成功:', result);

      res.json({
        message: '场景提取已启动',
        jobId: result.jobId,
        scriptId,
        status: 'extracting'
      });
    } catch (error) {
      console.error('[Extract Scenes]', error);
      res.status(500).json({ message: '提取场景失败: ' + error.message });
    }
  });
};
