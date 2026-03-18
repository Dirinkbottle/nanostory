class HttpError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }

  toResponseBody() {
    return {
      message: this.message,
      ...this.data
    };
  }
}

class WorkflowConflictError extends HttpError {
  constructor({ workflowType, jobId, conflictKey }) {
    super(409, '已有相同资源的生成任务正在运行', {
      workflowType,
      jobId,
      conflictKey
    });
    this.name = 'WorkflowConflictError';
  }
}

function sendGenerationError(res, error, fallbackMessage, logPrefix) {
  if (error instanceof HttpError) {
    return res.status(error.status).json(error.toResponseBody());
  }

  console.error(logPrefix, error);
  return res.status(500).json({
    message: error.message || fallbackMessage
  });
}

module.exports = {
  HttpError,
  WorkflowConflictError,
  sendGenerationError
};
