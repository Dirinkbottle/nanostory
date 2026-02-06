/**
 * 工作流任务 API 路由
 * 
 * 前端只需要：
 * 1. POST /api/workflows       - 启动工作流
 * 2. GET  /api/workflows/:jobId - 轮询工作流状态（含所有子任务）
 * 3. POST /api/workflows/:jobId/resume  - 恢复失败的工作流
 * 4. POST /api/workflows/:jobId/cancel  - 取消工作流
 * 5. GET  /api/workflows        - 获取用户的工作流列表
 * 6. GET  /api/workflows/types   - 获取可用的工作流类型
 */

const express = require('express');
const { authMiddleware } = require('../middleware');
const engine = require('./engine');
const { getAvailableWorkflows } = require('./definitions');

const router = express.Router();

/**
 * 获取可用的工作流类型
 */
router.get('/types', authMiddleware, (req, res) => {
  try {
    const workflows = getAvailableWorkflows();
    res.json({ workflows });
  } catch (error) {
    console.error('[Workflow Types]', error);
    res.status(500).json({ message: '获取工作流类型失败' });
  }
});

/**
 * 获取用户的工作流列表
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, workflowType, status, limit } = req.query;

    const jobs = await engine.getUserJobs(userId, {
      projectId: projectId ? parseInt(projectId) : undefined,
      workflowType,
      status,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({ jobs });
  } catch (error) {
    console.error('[Get Workflows]', error);
    res.status(500).json({ message: error.message || '获取工作流列表失败' });
  }
});

/**
 * 启动工作流
 * 
 * Body: {
 *   workflowType: 'script_only' | 'script_and_characters' | 'comic_generation',
 *   projectId: number,
 *   params: { title, description, style, length, modelName, ... }
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { workflowType, projectId, params } = req.body;

    if (!workflowType) {
      return res.status(400).json({ message: '缺少 workflowType' });
    }

    const result = await engine.startWorkflow(workflowType, {
      userId,
      projectId,
      jobParams: params || {}
    });

    res.json({
      jobId: result.jobId,
      tasks: result.tasks,
      message: '工作流已启动'
    });
  } catch (error) {
    console.error('[Start Workflow]', error);
    res.status(500).json({ message: error.message || '启动工作流失败' });
  }
});

/**
 * 查询项目的活跃（未消费）工作流
 */
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: '缺少 projectId' });
    }
    const { queryAll } = require('../dbHelper');
    const jobs = await queryAll(
      `SELECT * FROM workflow_jobs 
       WHERE user_id = ? AND project_id = ? 
         AND ((status IN ('pending', 'running')) OR (status IN ('completed', 'failed') AND is_consumed = 0))
       ORDER BY created_at DESC LIMIT 5`,
      [userId, parseInt(projectId)]
    );
    const parsed = jobs.map(job => {
      if (job.input_params && typeof job.input_params === 'string') {
        try { job.input_params = JSON.parse(job.input_params); } catch(e) {}
      }
      return job;
    });
    res.json({ jobs: parsed });
  } catch (error) {
    console.error('[Active Workflows]', error);
    res.status(500).json({ message: error.message || '查询活跃工作流失败' });
  }
});

/**
 * 标记工作流已消费
 */
router.post('/:jobId/consume', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    const { execute } = require('../dbHelper');
    await execute(
      'UPDATE workflow_jobs SET is_consumed = 1 WHERE id = ? AND user_id = ?',
      [parseInt(jobId), userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[Consume Workflow]', error);
    res.status(500).json({ message: error.message || '标记消费失败' });
  }
});

/**
 * 获取工作流状态（含所有子任务详情）
 */
router.get('/:jobId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const job = await engine.getJobStatus(parseInt(jobId));

    // 验证所有权
    if (job.user_id !== userId) {
      return res.status(403).json({ message: '无权访问此工作流' });
    }

    res.json(job);
  } catch (error) {
    console.error('[Get Workflow Status]', error);
    res.status(500).json({ message: error.message || '获取工作流状态失败' });
  }
});

/**
 * 恢复失败的工作流（断点续传）
 */
router.post('/:jobId/resume', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    // 验证所有权
    const job = await engine.getJobStatus(parseInt(jobId));
    if (job.user_id !== userId) {
      return res.status(403).json({ message: '无权访问此工作流' });
    }

    const result = await engine.resumeWorkflow(parseInt(jobId));
    res.json(result);
  } catch (error) {
    console.error('[Resume Workflow]', error);
    res.status(500).json({ message: error.message || '恢复工作流失败' });
  }
});

/**
 * 取消工作流
 */
router.post('/:jobId/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const result = await engine.cancelWorkflow(parseInt(jobId), userId);
    res.json(result);
  } catch (error) {
    console.error('[Cancel Workflow]', error);
    res.status(500).json({ message: error.message || '取消工作流失败' });
  }
});

module.exports = router;
