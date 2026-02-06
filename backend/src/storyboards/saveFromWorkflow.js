/**
 * POST /api/storyboards/save-from-workflow
 * 保存工作流生成的分镜结果
 */

const { queryOne, execute } = require('../dbHelper');

async function saveFromWorkflow(req, res) {
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

    // result_data 可能是字符串或对象，需要判断
    let resultData;
    if (typeof task.result_data === 'string') {
      resultData = JSON.parse(task.result_data);
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

    console.log('[Save Storyboard] 保存分镜数据到 scriptId:', scriptId, '共', scenes.length, '个镜头');
    console.log('[Save Storyboard] 项目ID:', script.project_id);

    // 删除旧的分镜（只删除当前 scriptId 的分镜）
    const deleteResult = await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
    console.log('[Save Storyboard] 删除了', deleteResult.changes || 0, '条旧分镜记录');

    // 批量插入新分镜
    for (const scene of scenes) {
      const idx = scene.order || 0;
      const promptTemplate = scene.description || '';
      const variablesJson = JSON.stringify({
        shotType: scene.shotType || '中景',
        dialogue: scene.dialogue || '',
        duration: scene.duration || 3,
        characters: scene.characters || [],
        location: scene.location || '',
        emotion: scene.emotion || '',
        hasAction: scene.hasAction || false,
        startFrame: scene.startFrame || '',
        endFrame: scene.endFrame || ''
      });
      
      await execute(
        'INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json) VALUES (?, ?, ?, ?, ?)', 
        [script.project_id, scriptId, idx, promptTemplate, variablesJson]
      );
    }

    res.json({
      success: true,
      count: scenes.length,
      message: `成功生成 ${scenes.length} 个分镜`
    });
  } catch (error) {
    console.error('[Save Storyboard]', error);
    res.status(500).json({ message: '保存失败：' + error.message });
  }
}

module.exports = saveFromWorkflow;
