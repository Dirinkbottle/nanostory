import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '../../services/auth';
import { getWorkflowList, WorkflowJob } from '../../hooks/useWorkflow';

// Polling interval constants (in milliseconds)
const POLLING_ACTIVE = 3000;    // When there are active tasks
const POLLING_IDLE = 10000;     // When no active tasks
const POLLING_MINIMIZED = 15000; // When panel is collapsed

// 需要在完成后刷新页面的任务类型
const REFRESH_ON_COMPLETE_TYPES = [
  'single_frame_generation',     // 分镜单帧生成
  'batch_frame_generation',      // 批量分镜帧生成
  'scene_image_generation',      // 场景图片生成
  'character_views_generation',  // 角色三视图生成
];

export interface UseTaskQueueReturn {
  jobs: WorkflowJob[];
  loading: boolean;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  fetchJobs: (showLoading?: boolean) => Promise<void>;
  getJobProgress: (job: WorkflowJob) => number;
}

export function useTaskQueue(): UseTaskQueueReturn {
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstLoad = useRef(true);
  // 跟踪上一次的任务ID集合，用于检测任务完成
  const prevJobIdsRef = useRef<Set<number>>(new Set());
  const prevJobTypesRef = useRef<Map<number, string>>(new Map());
  const currentIntervalRef = useRef<number>(POLLING_IDLE);

  const fetchJobs = useCallback(async (showLoading = false) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      // 只在手动刷新或首次加载时显示 loading
      if (showLoading || isFirstLoad.current) {
        setLoading(true);
      }
      const data = await getWorkflowList({ status: 'pending,running' });
      const currentJobs = data.jobs || [];
      const currentJobIds = new Set(currentJobs.map((j: WorkflowJob) => j.id));

      // 检测已完成的任务（之前存在但现在不在列表中）
      if (!isFirstLoad.current) {
        const completedJobIds: number[] = [];
        prevJobIdsRef.current.forEach(id => {
          if (!currentJobIds.has(id)) {
            completedJobIds.push(id);
          }
        });

        // 检查是否有需要触发更新的任务完成
        const refreshJobIds = completedJobIds.filter(id => {
          const jobType = prevJobTypesRef.current.get(id);
          return jobType && REFRESH_ON_COMPLETE_TYPES.includes(jobType);
        });

        if (refreshJobIds.length > 0) {
          console.log('[TaskQueue] 检测到图片生成任务完成，触发分镜数据刷新', refreshJobIds);
          // 派发自定义事件，通知分镜页面刷新数据
          window.dispatchEvent(new CustomEvent('storyboard:taskCompleted', {
            detail: { completedJobIds: refreshJobIds }
          }));
        }
      }

      // 更新跟踪状态
      prevJobIdsRef.current = currentJobIds;
      prevJobTypesRef.current = new Map(currentJobs.map((j: WorkflowJob) => [j.id, j.workflow_type]));

      setJobs(currentJobs);
      isFirstLoad.current = false;
    } catch (err) {
      console.error('[TaskQueue] 获取任务列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate adaptive polling interval based on task states and panel visibility
  const getPollingInterval = useCallback(() => {
    // When minimized/collapsed, use slower polling
    if (!isExpanded) {
      return POLLING_MINIMIZED;
    }
    // Check for active tasks (running or pending)
    const hasActiveTasks = jobs.some(
      (j) => j.status === 'running' || j.status === 'pending'
    );
    return hasActiveTasks ? POLLING_ACTIVE : POLLING_IDLE;
  }, [jobs, isExpanded]);

  // Effect to manage adaptive polling interval
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const newInterval = getPollingInterval();
    
    // Only reset interval if it changed
    if (newInterval !== currentIntervalRef.current || !intervalRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      currentIntervalRef.current = newInterval;
      intervalRef.current = setInterval(() => fetchJobs(false), newInterval);
      console.log(`[TaskQueue] Polling interval adjusted to ${newInterval}ms`);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [getPollingInterval, fetchJobs]);

  // Initial fetch on mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetchJobs(true); // First load shows loading state
  }, [fetchJobs]);

  const getJobProgress = useCallback((job: WorkflowJob) => {
    if (!job.tasks || job.tasks.length === 0) return 0;
    return Math.round(job.tasks.reduce((sum, t) => sum + t.progress, 0) / job.tasks.length);
  }, []);

  return {
    jobs,
    loading,
    isExpanded,
    setIsExpanded,
    fetchJobs,
    getJobProgress,
  };
}
