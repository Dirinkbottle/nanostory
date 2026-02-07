/**
 * 上下文构建模块
 * 负责构建工作流执行上下文
 */

const { queryAll } = require('../../dbHelper');

class ContextBuilder {
  /**
   * 构建工作流上下文（收集之前步骤的结果）
   */
  async buildContext(jobId, job) {
    const completedTasks = await queryAll(
      `SELECT step_index, result_data FROM generation_tasks 
       WHERE job_id = ? AND status = 'completed' 
       ORDER BY step_index ASC`,
      [jobId]
    );

    const previousResults = {};
    for (const task of completedTasks) {
      const data = typeof task.result_data === 'string' 
        ? JSON.parse(task.result_data) 
        : task.result_data;
      previousResults[task.step_index] = data;
    }

    const jobParams = typeof job.input_params === 'string'
      ? JSON.parse(job.input_params)
      : job.input_params;

    return {
      jobParams,
      previousResults,
      userId: job.user_id,  // 添加 userId 到上下文
      projectId: job.project_id  // 添加 projectId 到上下文
    };
  }
}

module.exports = ContextBuilder;
