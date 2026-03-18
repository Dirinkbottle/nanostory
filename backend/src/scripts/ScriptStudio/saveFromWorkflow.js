/**
 * POST /api/scripts/save-from-workflow
 * 保存工作流生成的剧本到 scripts 表
 */

const { queryOne, execute } = require('../../dbHelper');

async function saveFromWorkflow(req, res) {
  const { scriptId, jobId } = req.body;
  const userId = req.user.id;

  try {
    // 验证 scriptId 归属
    const script = await queryOne(
      'SELECT id, project_id, episode_number FROM scripts WHERE id = ? AND user_id = ?',
      [scriptId, userId]
    );
    
    if (!script) {
      return res.status(404).json({ message: '剧本不存在或无权访问' });
    }

    // 获取工作流任务结果
    const task = await queryOne(
      `SELECT result_data, status FROM generation_tasks 
       WHERE job_id = ? AND task_type = 'script_generation' 
       ORDER BY id DESC LIMIT 1`,
      [jobId]
    );

    if (!task || task.status !== 'completed') {
      return res.status(400).json({ message: '工作流任务未完成' });
    }

    const result = task.result_data;
    const content = result.content;
    const tokens = result.tokens || 0;
    const provider = result.provider || 'unknown';

    // 更新剧本内容和状态
    await execute(
      'UPDATE scripts SET content = ?, model_provider = ?, token_used = ?, status = ? WHERE id = ?', 
      [content, provider, tokens, 'completed', scriptId]
    );

    res.json({
      success: true,
      scriptId,
      episodeNumber: script.episode_number,
      message: '剧本保存成功'
    });
  } catch (error) {
    console.error('[Save Script from Workflow]', error);
    res.status(500).json({ message: '保存失败：' + error.message });
  }
}

module.exports = saveFromWorkflow;
