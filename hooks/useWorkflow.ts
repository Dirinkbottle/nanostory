import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '../services/auth';

// ============================================================
// Types
// ============================================================

export interface WorkflowTask {
  id: number;
  job_id: number;
  step_index: number;
  task_type: string;
  target_type: string;
  target_id: number | null;
  model_name: string | null;
  input_params: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result_data: any;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowJob {
  id: number;
  user_id: number;
  project_id: number;
  workflow_type: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  current_step_index: number;
  total_steps: number;
  input_params: any;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  tasks: WorkflowTask[];
}

interface UseWorkflowOptions {
  /** 轮询间隔（毫秒），默认 2000 */
  interval?: number;
  /** 工作流完成回调 */
  onCompleted?: (job: WorkflowJob) => void;
  /** 工作流失败回调 */
  onFailed?: (job: WorkflowJob) => void;
  /** 进度更新回调 */
  onProgress?: (job: WorkflowJob) => void;
}

// ============================================================
// API 函数
// ============================================================

async function fetchApi(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}

/** 启动工作流 */
export async function startWorkflow(
  workflowType: string,
  projectId: number,
  params: Record<string, any>
): Promise<{ jobId: number; tasks: any[] }> {
  return fetchApi('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({ workflowType, projectId, params })
  });
}

/** 获取工作流状态 */
export async function getWorkflowStatus(jobId: number): Promise<WorkflowJob> {
  return fetchApi(`/api/workflows/${jobId}`);
}

/** 恢复工作流 */
export async function resumeWorkflow(jobId: number) {
  return fetchApi(`/api/workflows/${jobId}/resume`, { method: 'POST' });
}

/** 取消工作流 */
export async function cancelWorkflow(jobId: number) {
  return fetchApi(`/api/workflows/${jobId}/cancel`, { method: 'POST' });
}

/** 获取工作流列表 */
export async function getWorkflowList(options: {
  projectId?: number;
  workflowType?: string;
  status?: string;
} = {}): Promise<{ jobs: WorkflowJob[] }> {
  const params = new URLSearchParams();
  if (options.projectId) params.set('projectId', String(options.projectId));
  if (options.workflowType) params.set('workflowType', options.workflowType);
  if (options.status) params.set('status', options.status);
  const qs = params.toString();
  return fetchApi(`/api/workflows${qs ? '?' + qs : ''}`);
}

/** 查询项目的活跃（未消费）工作流 */
export async function getActiveWorkflows(projectId: number): Promise<{ jobs: WorkflowJob[] }> {
  return fetchApi(`/api/workflows/active?projectId=${projectId}`);
}

/** 标记工作流已消费 */
export async function consumeWorkflow(jobId: number): Promise<void> {
  await fetchApi(`/api/workflows/${jobId}/consume`, { method: 'POST' });
}

// ============================================================
// Hook: useWorkflow
// 轮询工作流状态，自动在完成/失败时停止
// ============================================================

export function useWorkflow(jobId: number | null, options: UseWorkflowOptions = {}) {
  const { interval = 2000, onCompleted, onFailed, onProgress } = options;

  const [job, setJob] = useState<WorkflowJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRefs = useRef({ onCompleted, onFailed, onProgress });

  // 保持回调引用最新
  useEffect(() => {
    callbackRefs.current = { onCompleted, onFailed, onProgress };
  }, [onCompleted, onFailed, onProgress]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkflowStatus(jobId);
      setJob(data);

      // 进度回调
      callbackRefs.current.onProgress?.(data);

      // 终态：停止轮询
      if (data.status === 'completed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        callbackRefs.current.onCompleted?.(data);
      } else if (data.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        callbackRefs.current.onFailed?.(data);
      } else if (data.status === 'cancelled') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // 开始轮询
  const startPolling = useCallback(() => {
    if (!jobId) return;
    fetchJob();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchJob, interval);
  }, [jobId, interval, fetchJob]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // jobId 变化时自动开始/停止轮询
  useEffect(() => {
    if (jobId) {
      startPolling();
    } else {
      stopPolling();
      setJob(null);
    }
    return stopPolling;
  }, [jobId, startPolling, stopPolling]);

  // 恢复工作流
  const resume = useCallback(async () => {
    if (!jobId) return;
    try {
      await resumeWorkflow(jobId);
      startPolling();
    } catch (err: any) {
      setError(err.message);
    }
  }, [jobId, startPolling]);

  // 取消工作流
  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await cancelWorkflow(jobId);
      stopPolling();
      await fetchJob();
    } catch (err: any) {
      setError(err.message);
    }
  }, [jobId, stopPolling, fetchJob]);

  // 计算整体进度
  const overallProgress = job?.tasks
    ? Math.round(job.tasks.reduce((sum, t) => sum + t.progress, 0) / job.tasks.length)
    : 0;

  return {
    job,
    tasks: job?.tasks || [],
    loading,
    error,
    startPolling,
    stopPolling,
    resume,
    cancel,
    // 便捷状态
    isRunning: job?.status === 'running' || job?.status === 'pending',
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isCancelled: job?.status === 'cancelled',
    overallProgress,
    currentStep: job?.current_step_index ?? 0,
    totalSteps: job?.total_steps ?? 0
  };
}
