const { queryOne, queryAll, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /save-from-workflow - 保存工作流生成的分镜结果
module.exports = (router) => {
  router.post('/save-from-workflow', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { scriptId, jobId } = req.body;

    if (!scriptId || !jobId) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    try {
      console.log('[Save Storyboard] 保存工作流结果:', { scriptId, jobId });

      // 获取工作流结果
      const job = await queryOne('SELECT * FROM workflow_jobs WHERE id = ? AND user_id = ?', [jobId, userId]);
      if (!job) {
        return res.status(404).json({ message: '工作流不存在' });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ message: '工作流尚未完成' });
      }

      // 获取任务结果
      const task = await queryOne(
        'SELECT * FROM generation_tasks WHERE job_id = ? AND task_type = ? ORDER BY step_index LIMIT 1',
        [jobId, 'storyboard_generation']
      );

      if (!task || !task.result_data) {
        return res.status(404).json({ message: '未找到分镜生成结果' });
      }

      // result_data 可能已经是对象或者是 JSON 字符串
      let resultData;
      if (typeof task.result_data === 'string') {
        try {
          resultData = JSON.parse(task.result_data);
        } catch (e) {
          console.error('[Save Storyboard] JSON 解析失败:', e);
          return res.status(500).json({ message: 'result_data 格式错误' });
        }
      } else {
        resultData = task.result_data;
      }
      
      const scenes = resultData.scenes || [];

      if (!Array.isArray(scenes) || scenes.length === 0) {
        return res.status(400).json({ message: '分镜数据为空' });
      }

      // 获取剧本信息
      const script = await queryOne(
        'SELECT project_id FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在' });
      }

      const projectId = script.project_id;

      // 删除该剧本的旧分镜
      await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
      console.log('[Save Storyboard] 已删除旧分镜');

      // 保存新分镜
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        await execute(
          `INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json, image_ref) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            scriptId,
            i,
            scene.description || scene.prompt_template || '',
            JSON.stringify(scene.variables || scene),
            scene.image_ref || scene.imageUrl || null
          ]
        );
      }

      console.log('[Save Storyboard] 保存了', scenes.length, '个分镜');

      res.json({
        message: '分镜保存成功',
        count: scenes.length,
        scriptId
      });
    } catch (error) {
      console.error('[Save Storyboard]', error);
      res.status(500).json({ message: '保存分镜失败: ' + error.message });
    }
  });
};
