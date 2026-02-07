import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '../../services/auth';
import { getWorkflowList, WorkflowJob } from '../../hooks/useWorkflow';

export interface UseTaskQueueReturn {
  jobs: WorkflowJob[];
  loading: boolean;
  fetchJobs: (showLoading?: boolean) => Promise<void>;
  getJobProgress: (job: WorkflowJob) => number;
}

export function useTaskQueue(): UseTaskQueueReturn {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstLoad = useRef(true);

  const fetchJobs = useCallback(async (showLoading = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      // 只在手动刷新或首次加载时显示 loading
      if (showLoading || isFirstLoad.current) {
        setLoading(true);
      }
      const data = await getWorkflowList({ status: 'pending,running' });
      setJobs(data.jobs || []);
      isFirstLoad.current = false;
    } catch (err) {
      console.error('[TaskQueue] 获取任务列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetchJobs(true); // 首次加载显示 loading
    intervalRef.current = setInterval(() => fetchJobs(false), 5000); // 自动刷新不显示
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
