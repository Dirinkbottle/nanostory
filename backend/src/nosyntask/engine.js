/**
 * 工作流执行引擎（Workflow Engine）
 * 
 * 职责：
 * 1. 创建工作流 Job + 预创建所有子任务（pending）
 * 2. 按顺序执行步骤，步骤间传递数据
 * 3. 处理失败：当前步骤失败 -> 后续步骤自动暂停，Job 标记 failed
 * 4. 支持断点恢复：从第一个 pending 的步骤继续执行
 * 
 * 不做的事：
 * - 不处理副作用（保存剧本、扣费等）
 * - 副作用由调用方通过查询 result_data 自行处理
 */

const { queryOne, queryAll, execute } = require('../dbHelper');
const { getWorkflowDefinition } = require('./definitions');

class WorkflowEngine {

  /**
   * 启动工作流
   * 
   * @param {string} workflowType - 工作流类型（对应 definitions.js 中的 key）
   * @param {object} params - 工作流参数
   * @param {number} params.userId
   * @param {number} params.projectId
   * @param {object} params.jobParams - 传给工作流的业务参数（如 title, description 等）
   * @returns {Promise<{ jobId: number, tasks: Array }>}
   */
  async startWorkflow(workflowType, { userId, projectId, jobParams }) {
    const definition = getWorkflowDefinition(workflowType);
    if (!definition) {
      throw new Error(`未知的工作流类型: ${workflowType}`);
    }

    const steps = definition.steps;

    // 1. 创建 workflow_job
    const jobResult = await execute(
      `INSERT INTO workflow_jobs 
       (user_id, project_id, workflow_type, status, current_step_index, total_steps, input_params) 
       VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
      [userId, projectId, workflowType, steps.length, JSON.stringify(jobParams)]
    );
    const jobId = jobResult.insertId;

    console.log(`[WorkflowEngine] 创建工作流: jobId=${jobId}, type=${workflowType}, steps=${steps.length}`);

    // 2. 预创建所有 generation_tasks（状态为 pending）
    const tasks = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const taskResult = await execute(
        `INSERT INTO generation_tasks 
         (job_id, step_index, user_id, project_id, task_type, target_type, status, progress) 
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
        [jobId, i, userId, projectId, step.type, step.targetType]
      );
      tasks.push({
        id: taskResult.insertId,
        stepIndex: i,
        type: step.type,
        status: 'pending'
      });
    }

    // 3. 异步触发执行（不阻塞返回）
    this.runNextStep(jobId).catch(err => {
      console.error(`[WorkflowEngine] 工作流启动失败: jobId=${jobId}`, err);
    });

    return { jobId, tasks };
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
      console.log(`[WorkflowEngine] 工作流已结束: jobId=${jobId}, status=${job.status}`);
      return;
    }

    // 获取工作流定义
    const definition = getWorkflowDefinition(job.workflow_type);
    if (!definition) {
      await this._failJob(jobId, `工作流定义不存在: ${job.workflow_type}`);
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
      await this._completeJob(jobId);
      return;
    }

    const stepIndex = pendingTask.step_index;
    const stepDef = definition.steps[stepIndex];

    if (!stepDef) {
      await this._failTask(pendingTask.id, `步骤定义不存在: index=${stepIndex}`);
      await this._failJob(jobId, `步骤定义不存在: index=${stepIndex}`);
      return;
    }

    // 更新 Job 状态
    await execute(
      `UPDATE workflow_jobs SET status = 'running', current_step_index = ?, started_at = COALESCE(started_at, NOW()) WHERE id = ?`,
      [stepIndex, jobId]
    );

    // 构建上下文：收集之前所有步骤的 result_data
    const context = await this._buildContext(jobId, job);

    // 构建本步骤的 input_params
    let inputParams;
    try {
      inputParams = stepDef.buildInput(context);
    } catch (err) {
      await this._failTask(pendingTask.id, `构建输入参数失败: ${err.message}`);
      await this._failJob(jobId, `步骤 ${stepIndex} 输入参数构建失败: ${err.message}`);
      return;
    }

    // 执行任务
    await this._executeTask(pendingTask.id, stepDef, inputParams, jobId);
  }

  /**
   * 执行单个任务
   */
  async _executeTask(taskId, stepDef, inputParams, jobId) {
    try {
      // 更新任务状态为 processing
      await execute(
        `UPDATE generation_tasks 
         SET status = 'processing', input_params = ?, model_name = ?, started_at = NOW(), progress = 10 
         WHERE id = ?`,
        [JSON.stringify(inputParams), inputParams.modelName || null, taskId]
      );

      console.log(`[WorkflowEngine] 执行任务: taskId=${taskId}, type=${stepDef.type}`);

      // 进度回调
      const onProgress = async (progress) => {
        await execute('UPDATE generation_tasks SET progress = ? WHERE id = ?', [progress, taskId]);
      };

      // 调用 handler（纯 AI 调用，返回 result_data）
      const resultData = await stepDef.handler(inputParams, onProgress);

      // 任务成功
      await this._completeTask(taskId, resultData);

      // 触发下一步
      await this.runNextStep(jobId);

    } catch (error) {
      console.error(`[WorkflowEngine] 任务执行失败: taskId=${taskId}`, error);
      await this._failTask(taskId, error.message);
      await this._failJob(jobId, `步骤执行失败: ${error.message}`);
    }
  }

  /**
   * 构建工作流上下文（收集之前步骤的结果）
   */
  async _buildContext(jobId, job) {
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
      : (job.input_params || {});

    return { jobParams, previousResults };
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

    console.log(`[WorkflowEngine] 恢复工作流: jobId=${jobId}`);

    // 触发执行
    this.runNextStep(jobId).catch(err => {
      console.error(`[WorkflowEngine] 恢复工作流失败: jobId=${jobId}`, err);
    });

    return { jobId, status: 'resuming' };
  }

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

    return { jobId, status: 'cancelled' };
  }

  /**
   * 获取工作流状态（含所有子任务）
   */
  async getJobStatus(jobId) {
    const job = await queryOne('SELECT * FROM workflow_jobs WHERE id = ?', [jobId]);
    if (!job) {
      throw new Error('工作流不存在');
    }

    // 解析 JSON
    if (job.input_params && typeof job.input_params === 'string') {
      job.input_params = JSON.parse(job.input_params);
    }

    // 获取所有子任务
    const tasks = await queryAll(
      `SELECT * FROM generation_tasks WHERE job_id = ? ORDER BY step_index ASC`,
      [jobId]
    );

    // 解析子任务的 JSON 字段
    const parsedTasks = tasks.map(t => {
      if (t.input_params && typeof t.input_params === 'string') {
        try { t.input_params = JSON.parse(t.input_params); } catch(e) {}
      }
      if (t.result_data && typeof t.result_data === 'string') {
        try { t.result_data = JSON.parse(t.result_data); } catch(e) {}
      }
      return t;
    });

    // 获取工作流定义信息
    const definition = getWorkflowDefinition(job.workflow_type);

    return {
      ...job,
      workflowName: definition?.name || job.workflow_type,
      tasks: parsedTasks
    };
  }

  /**
   * 获取用户的工作流列表
   */
  async getUserJobs(userId, options = {}) {
    const { projectId, workflowType, status, limit = 50 } = options;

    let sql = 'SELECT * FROM workflow_jobs WHERE user_id = ?';
    const params = [userId];

    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }
    if (workflowType) {
      sql += ' AND workflow_type = ?';
      params.push(workflowType);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const jobs = await queryAll(sql, params);

    return jobs.map(job => {
      if (job.input_params && typeof job.input_params === 'string') {
        try { job.input_params = JSON.parse(job.input_params); } catch(e) {}
      }
      return job;
    });
  }

  // ============================================================
  // 内部辅助方法
  // ============================================================

  async _completeTask(taskId, resultData) {
    await execute(
      `UPDATE generation_tasks 
       SET status = 'completed', progress = 100, result_data = ?, completed_at = NOW() 
       WHERE id = ?`,
      [JSON.stringify(resultData), taskId]
    );
    console.log(`[WorkflowEngine] 任务完成: taskId=${taskId}`);
  }

  async _failTask(taskId, errorMessage) {
    await execute(
      `UPDATE generation_tasks 
       SET status = 'failed', error_message = ?, completed_at = NOW() 
       WHERE id = ?`,
      [errorMessage, taskId]
    );
    console.log(`[WorkflowEngine] 任务失败: taskId=${taskId}, error=${errorMessage}`);
  }

  async _completeJob(jobId) {
    await execute(
      `UPDATE workflow_jobs SET status = 'completed', completed_at = NOW() WHERE id = ?`,
      [jobId]
    );
    console.log(`[WorkflowEngine] 工作流完成: jobId=${jobId}`);
  }

  async _failJob(jobId, errorMessage) {
    await execute(
      `UPDATE workflow_jobs SET status = 'failed', error_message = ? WHERE id = ?`,
      [errorMessage, jobId]
    );
    console.log(`[WorkflowEngine] 工作流失败: jobId=${jobId}, error=${errorMessage}`);
  }
}

// 单例导出
module.exports = new WorkflowEngine();
