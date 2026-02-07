/**
 * 工作流恢复模块
 * 负责断点续传和恢复失败的工作流
 */

const { queryOne, execute } = require('../../dbHelper');

class WorkflowResumer {
  constructor(workflowExecutor) {
    this.workflowExecutor = workflowExecutor;
  }

  /**
   * 恢复工作流（断点续传）
   * 从第一个 pending 的步骤继续执行
   */
  async resumeWorkflow(jobId) {
    const job = await queryOne('SELECT * FROM workflow_jobs WHERE id = ?', [jobId]);
    if (!job) {
      throw new Error(`工作流不存在: jobId=${jobId}`);
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      throw new Error(`工作流已结束，无法恢复: status=${job.status}`);
    }

    // 如果是 failed 状态，重置为 running
    if (job.status === 'failed') {
      await execute(
        `UPDATE workflow_jobs SET status = 'running', error_message = NULL WHERE id = ?`,
        [jobId]
      );

      // 将 failed 的任务重置为 pending（只重置最后一个失败的）
      await execute(
        `UPDATE generation_tasks SET status = 'pending', error_message = NULL, progress = 0 
         WHERE job_id = ? AND status = 'failed'`,
        [jobId]
      );
    }

    console.log(`[WorkflowResumer] 恢复工作流: jobId=${jobId}`);

    // 触发执行
    this.workflowExecutor.runNextStep(jobId).catch(err => {
      console.error(`[WorkflowResumer] 恢复工作流失败: jobId=${jobId}`, err);
    });

    return { jobId, status: 'resuming' };
  }
}

module.exports = WorkflowResumer;
