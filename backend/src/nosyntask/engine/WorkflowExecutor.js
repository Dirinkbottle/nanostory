/**
 * 工作流执行模块
 * 负责执行工作流步骤和任务
 */

const { queryOne, queryAll, execute } = require('../../dbHelper');
const { getWorkflowDefinition } = require('../definitions');
const ContextBuilder = require('./ContextBuilder');
const JobStatusManager = require('./JobStatusManager');
const { runWithTrace } = require('./generationTrace');

class WorkflowExecutor {
  constructor() {
    this.contextBuilder = new ContextBuilder();
    this.jobStatusManager = new JobStatusManager();
  }

  /**
   * 执行下一个 pending 的步骤
   * 这是引擎的核心调度逻辑
   */
  async runNextStep(jobId) {
    // 获取 Job 信息
    const job = await queryOne('SELECT * FROM workflow_jobs WHERE id = ?', [jobId]);
    if (!job) {
      throw new Error(`工作流不存在: jobId=${jobId}`);
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      console.log(`[WorkflowExecutor] 工作流已结束: jobId=${jobId}, status=${job.status}`);
      return;
    }

    // 获取工作流定义
    const definition = getWorkflowDefinition(job.workflow_type);
    if (!definition) {
      await this.jobStatusManager.failJob(jobId, `工作流定义不存在: ${job.workflow_type}`);
      return;
    }

    // 找到第一个 pending 的任务
    const pendingTask = await queryOne(
      `SELECT * FROM generation_tasks 
       WHERE job_id = ? AND status = 'pending' 
       ORDER BY step_index ASC LIMIT 1`,
      [jobId]
    );

    if (!pendingTask) {
      // 所有步骤都完成了
      await this.jobStatusManager.completeJob(jobId);
      return;
    }

    const stepIndex = pendingTask.step_index;
    const stepDef = definition.steps[stepIndex];

    if (!stepDef) {
      await this.jobStatusManager.failTask(pendingTask.id, `步骤定义不存在: index=${stepIndex}`);
      await this.jobStatusManager.failJob(jobId, `步骤定义不存在: index=${stepIndex}`);
      return;
    }

    // 更新 Job 状态
    await execute(
      `UPDATE workflow_jobs SET status = 'running', current_step_index = ?, started_at = COALESCE(started_at, NOW()) WHERE id = ?`,
      [stepIndex, jobId]
    );

    // 构建上下文：收集之前所有步骤的 result_data
    const context = await this.contextBuilder.buildContext(jobId, job);

    // 构建本步骤的 input_params
    let inputParams;
    try {
      inputParams = stepDef.buildInput(context);
    } catch (err) {
      await this.jobStatusManager.failTask(pendingTask.id, `构建输入参数失败: ${err.message}`);
      await this.jobStatusManager.failJob(jobId, `步骤 ${stepIndex} 输入参数构建失败: ${err.message}`);
      return;
    }

    // 执行任务
    await this.executeTask(pendingTask.id, stepDef, inputParams, jobId);
  }

  /**
   * 执行单个任务
   */
  async executeTask(taskId, stepDef, inputParams, jobId) {
    try {
      // 更新任务状态为 processing
      await execute(
        `UPDATE generation_tasks 
         SET status = 'processing', input_params = ?, model_name = ?, started_at = NOW(), progress = 10 
         WHERE id = ?`,
        [JSON.stringify(inputParams), inputParams.textModel || inputParams.imageModel || inputParams.videoModel || inputParams.audioModel || null, taskId]
      );

      console.log(`[WorkflowExecutor] 执行任务: taskId=${taskId}, type=${stepDef.type}`);

      // 进度回调
      const onProgress = async (progress) => {
        await execute('UPDATE generation_tasks SET progress = ? WHERE id = ?', [progress, taskId]);
      };

      // 用追踪系统包裹 handler 调用，自动记录开始/结束/耗时
      const { result: resultData, trace: traceData } = await runWithTrace(taskId, stepDef.type, () => stepDef.handler(inputParams, onProgress));

      // 任务成功：保存 result_data + trace
      await this.jobStatusManager.completeTask(taskId, resultData, traceData);

      // 触发下一步
      await this.runNextStep(jobId);

    } catch (error) {
      console.error(`[WorkflowExecutor] 任务执行失败: taskId=${taskId}`, error);
      await this.jobStatusManager.failTask(taskId, error.message, error._trace || null);
      await this.jobStatusManager.failJob(jobId, `步骤执行失败: ${error.message}`);
    }
  }
}

module.exports = WorkflowExecutor;
