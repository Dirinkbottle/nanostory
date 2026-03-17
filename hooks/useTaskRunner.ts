/**
 * useTaskRunner - 通用异步任务执行 hook
 * 
 * 封装 startWorkflow + useWorkflow 轮询，提供：
 * - runTask(workflowType, params) 启动任务
 * - recoverTasks(workflowTypes, keyMapper) 恢复未消费的活跃任务
 * - 自动轮询进度
 * - 完成/失败回调
 * - 支持同时跟踪多个任务（按 key 区分）
 * - clearTask 时自动 consumeWorkflow
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { startWorkflow, getWorkflowStatus, getActiveWorkflows, consumeWorkflow, WorkflowJob, ApiError } from './useWorkflow';

export interface TaskState {
  jobId: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result: any | null;
  error: string | null;
}

interface UseTaskRunnerOptions {
  /** 轮询间隔（毫秒），默认 500 */
  interval?: number;
  /** projectId，默认 0 */
  projectId?: number;
}

/**
 * 通用任务执行 hook
 * 
 * 用法：
 * const { tasks, runTask, recoverTasks, isRunning } = useTaskRunner();
 * 
 * // 启动首尾帧生成
 * const jobId = await runTask('img_123', 'frame_generation', { prompt: '...' });
 * 
 * // 页面加载时恢复未完成的任务
 * recoverTasks(['frame_generation', 'single_frame_generation'], (job) => `img_${storyboardId}`);
 * 
 * // 读取某个任务状态
 * const task = tasks['img_123']; // { status, progress, result, error }
 */
export function useTaskRunner(options: UseTaskRunnerOptions = {}) {
  const { interval = 500, projectId = 0 } = options;

  const [tasks, setTasks] = useState<Record<string, TaskState>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // 用 ref 追踪 tasks，供 clearTask 读取 jobId
  const tasksRef = useRef<Record<string, TaskState>>({});
  const activeKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // 清理所有定时器
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  // 更新某个 key 的任务状态
  const updateTask = useCallback((key: string, patch: Partial<TaskState>) => {
    setTasks(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch } as TaskState
    }));
  }, []);

  // 停止某个 key 的轮询
  const stopPolling = useCallback((key: string) => {
    if (timersRef.current[key]) {
      clearInterval(timersRef.current[key]);
      delete timersRef.current[key];
    }
  }, []);

  // 开始轮询某个 jobId
  const startPolling = useCallback((key: string, jobId: number) => {
    stopPolling(key);
    activeKeysRef.current.add(key);
    let failCount = 0;
    const MAX_FAIL = 3; // 连续失败 3 次才真正停止

    const poll = async () => {
      try {
        const job = await getWorkflowStatus(jobId);
        failCount = 0; // 请求成功，重置失败计数
        // 计算所有任务的加权进度
        const allTasks = job.tasks || [];
        const progress = allTasks.length > 0
          ? Math.round(allTasks.reduce((sum: number, t: any) => sum + (t.progress ?? 0), 0) / allTasks.length)
          : 0;

        updateTask(key, {
          status: job.status,
          progress
        });

        if (job.status === 'completed') {
          stopPolling(key);
          const lastTask = allTasks[allTasks.length - 1];
          updateTask(key, {
            status: 'completed',
            progress: 100,
            result: lastTask?.result_data ?? null
          });
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          stopPolling(key);
          const failedTask = allTasks.find((t: any) => t.status === 'failed');
          updateTask(key, {
            status: job.status,
            error: job.error_message || failedTask?.error_message || '任务失败'
          });
        }
      } catch (err: any) {
        failCount++;
        if (failCount >= MAX_FAIL) {
          stopPolling(key);
          updateTask(key, {
            status: 'failed',
            error: err.message || '轮询失败'
          });
        }
        // 未达上限时忽略本次错误，等下次轮询重试
      }
    };

    // 立即查一次
    poll();
    timersRef.current[key] = setInterval(poll, interval);
  }, [interval, stopPolling, updateTask]);

  /**
   * 启动任务
   * @param key 唯一标识（如 'img_123'），用于跟踪状态
   * @param workflowType 工作流类型（如 'frame_generation'）
   * @param params 业务参数
   * @returns jobId
   */
  const runTask = useCallback(async (
    key: string,
    workflowType: string,
    params: Record<string, any>
  ): Promise<number> => {
    if (activeKeysRef.current.has(key)) {
      throw new Error('任务正在进行中，请等待当前任务结束');
    }

    activeKeysRef.current.add(key);
    // 初始化状态
    updateTask(key, {
      jobId: 0,
      status: 'pending',
      progress: 0,
      result: null,
      error: null
    });

    try {
      const { jobId } = await startWorkflow(workflowType, projectId, params);
      updateTask(key, { jobId, status: 'running' });
      startPolling(key, jobId);
      return jobId;
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 409 && error.data?.jobId) {
        const conflictJobId = Number(error.data.jobId);
        updateTask(key, {
          jobId: conflictJobId,
          status: 'running',
          progress: 0,
          result: null,
          error: null
        });
        startPolling(key, conflictJobId);
        return conflictJobId;
      }

      activeKeysRef.current.delete(key);
      updateTask(key, {
        status: 'failed',
        error: error.message || '启动任务失败'
      });
      throw error;
    }
  }, [projectId, updateTask, startPolling]);

  /**
   * 恢复未消费的活跃工作流任务
   * @param workflowTypes 要恢复的工作流类型列表
   * @param keyMapper 从 WorkflowJob 映射到任务 key，返回 null 则跳过
   */
  const recoverTasks = useCallback(async (
    workflowTypes: string[],
    keyMapper: (job: WorkflowJob) => string | null
  ) => {
    if (!projectId) return;

    try {
      const { jobs } = await getActiveWorkflows(projectId);
      if (!jobs || jobs.length === 0) return;

      for (const job of jobs) {
        if (!workflowTypes.includes(job.workflow_type)) continue;

        const key = keyMapper(job);
        if (!key) continue;

        // 跳过已在跟踪的任务
        if (tasksRef.current[key]) continue;

        console.log(`[useTaskRunner] 恢复任务: key=${key}, jobId=${job.id}, type=${job.workflow_type}`);
        activeKeysRef.current.add(key);
        updateTask(key, {
          jobId: job.id,
          status: (job.status === 'completed' || job.status === 'failed') ? job.status : 'running',
          progress: 0,
          result: null,
          error: null
        });
        startPolling(key, job.id);
      }
    } catch (error) {
      console.error('[useTaskRunner] 恢复任务失败:', error);
    }
  }, [projectId, updateTask, startPolling]);

  // 清除某个任务的状态，同时 consumeWorkflow
  const clearTask = useCallback((key: string) => {
    const task = tasksRef.current[key];
    if (task?.jobId) {
      consumeWorkflow(task.jobId).catch(err =>
        console.warn('[useTaskRunner] consumeWorkflow 失败:', err)
      );
    }
    activeKeysRef.current.delete(key);
    stopPolling(key);
    setTasks(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [stopPolling]);

  const isTaskActive = useCallback((key: string) => activeKeysRef.current.has(key), []);

  // 是否有任何任务在运行
  const isRunning = (Object.values(tasks) as TaskState[]).some(
    t => t.status === 'pending' || t.status === 'running'
  );

  return {
    tasks,
    runTask,
    recoverTasks,
    clearTask,
    stopPolling,
    isRunning,
    isTaskActive
  };
}
