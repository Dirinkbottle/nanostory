import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '../../services/auth';
import { getWorkflowList, WorkflowJob } from '../../hooks/useWorkflow';

export interface UseTaskQueueReturn {
  jobs: WorkflowJob[];
  loading: boolean;
  fetchJobs: () => Promise<void>;
  getJobProgress: (job: WorkflowJob) => number;
}

export function useTaskQueue(): UseTaskQueueReturn {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const data = await getWorkflowList({ status: 'pending,running' });
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('[TaskQueue] 获取任务列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchJobs]);

  const getJobProgress = useCallback((job: WorkflowJob) => {
    if (!job.tasks || job.tasks.length === 0) return 0;
    return Math.round(job.tasks.reduce((sum, t) => sum + t.progress, 0) / job.tasks.length);
  }, []);

  return {
    jobs,
    loading,
    fetchJobs,
    getJobProgress,
  };
}
