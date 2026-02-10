/**
 * 任务状态管理模块
 * 负责更新任务和工作流的状态
 */

const { execute } = require('../../dbHelper');

class JobStatusManager {
  /**
   * 标记任务完成
   */
  async completeTask(taskId, resultData, traceData = null) {
    await execute(
      `UPDATE generation_tasks 
       SET status = 'completed', progress = 100, result_data = ?, work_result = ?, completed_at = NOW() 
       WHERE id = ?`,
      [JSON.stringify(resultData), traceData ? JSON.stringify(traceData) : null, taskId]
    );
    console.log(`[JobStatusManager] 任务完成: taskId=${taskId}`);
  }

  /**
   * 标记任务失败
   */
  async failTask(taskId, errorMessage, traceData = null) {
    await execute(
      `UPDATE generation_tasks 
       SET status = 'failed', error_message = ?, work_result = ?, completed_at = NOW() 
       WHERE id = ?`,
      [errorMessage, traceData ? JSON.stringify(traceData) : null, taskId]
    );
    console.log(`[JobStatusManager] 任务失败: taskId=${taskId}, error=${errorMessage}`);
  }

  /**
   * 标记工作流完成
   */
  async completeJob(jobId) {
    await execute(
      `UPDATE workflow_jobs SET status = 'completed', completed_at = NOW() WHERE id = ?`,
      [jobId]
    );
    console.log(`[JobStatusManager] 工作流完成: jobId=${jobId}`);
  }

  /**
   * 标记工作流失败
   */
  async failJob(jobId, errorMessage) {
    await execute(
      `UPDATE workflow_jobs SET status = 'failed', error_message = ? WHERE id = ?`,
      [errorMessage, jobId]
    );
    console.log(`[JobStatusManager] 工作流失败: jobId=${jobId}, error=${errorMessage}`);
  }
}

module.exports = JobStatusManager;
