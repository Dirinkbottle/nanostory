const { queryAll } = require('../../../dbHelper');
const workflowEngine = require('../../workflow');
const { normalizeWorkflowJobForApi } = require('../utils/workflowParams');

class GenerationQueryService {
  async getJob(jobId) {
    const job = await workflowEngine.getJobStatus(jobId);
    return normalizeWorkflowJobForApi(job);
  }

  async getUserJobs(userId, options = {}) {
    const jobs = await workflowEngine.getUserJobs(userId, options);
    return jobs.map(normalizeWorkflowJobForApi);
  }

  async listActive({ userId, projectId }) {
    const jobs = await queryAll(
      `SELECT * FROM workflow_jobs
       WHERE user_id = ? AND project_id = ?
         AND ((status IN ('pending', 'running')) OR (status IN ('completed', 'failed') AND is_consumed = 0))
       ORDER BY created_at DESC LIMIT 5`,
      [userId, projectId]
    );

    return jobs.map(normalizeWorkflowJobForApi);
  }
}

module.exports = GenerationQueryService;
