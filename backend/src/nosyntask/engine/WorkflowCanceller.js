/**
 * 工作流取消模块
 * 负责取消正在运行的工作流
 */

const { queryOne, execute } = require('../../dbHelper');

class WorkflowCanceller {
  /**
   * 取消工作流
   */
  async cancelWorkflow(jobId, userId) {
    const job = await queryOne(
      'SELECT * FROM workflow_jobs WHERE id = ? AND user_id = ?',
      [jobId, userId]
    );

    if (!job) {
      throw new Error('工作流不存在或无权访问');
    }

    if (job.status === 'completed') {
      throw new Error('工作流已完成，无法取消');
    }

    // 取消所有 pending 的子任务
    await execute(
      `UPDATE generation_tasks SET status = 'failed', error_message = '工作流已取消' 
       WHERE job_id = ? AND status IN ('pending', 'processing')`,
      [jobId]
    );

    await execute(
      `UPDATE workflow_jobs SET status = 'cancelled', error_message = '用户取消', completed_at = NOW() WHERE id = ?`,
      [jobId]
    );

    console.log(`[WorkflowCanceller] 工作流已取消: jobId=${jobId}`);

    return { jobId, status: 'cancelled' };
  }
}

module.exports = WorkflowCanceller;
