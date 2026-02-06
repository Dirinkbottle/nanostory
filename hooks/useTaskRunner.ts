/**
 * useTaskRunner - 通用异步任务执行 hook
 * 
 * 封装 startWorkflow + useWorkflow 轮询，提供：
 * - runTask(workflowType, params) 启动任务
 * - 自动轮询进度
 * - 完成/失败回调
 * - 支持同时跟踪多个任务（按 key 区分）
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { startWorkflow, getWorkflowStatus, WorkflowJob, WorkflowTask } from './useWorkflow';

export interface TaskState {
  jobId: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result: any | null;
  error: string | null;
}

interface UseTaskRunnerOptions {
  /** 轮询间隔（毫秒），默认 2000 */
  interval?: number;
  /** projectId，默认 0 */
  projectId?: number;
}

/**
 * 通用任务执行 hook
 * 
 * 用法：
 * const { tasks, runTask, isRunning } = useTaskRunner();
 * 
 * // 启动首尾帧生成
 * const jobId = await runTask('scene_123', 'frame_generation', { prompt: '...' });
 * 
 * // 读取某个任务状态
 * const task = tasks['scene_123']; // { status, progress, result, error }
 */
export function useTaskRunner(options: UseTaskRunnerOptions = {}) {
  const { interval = 2000, projectId = 0 } = options;

  const [tasks, setTasks] = useState<Record<string, TaskState>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

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

    const poll = async () => {
      try {
        const job = await getWorkflowStatus(jobId);
        const task = job.tasks?.[0];
        const progress = task?.progress ?? 0;

        updateTask(key, {
          status: job.status,
          progress
        });

        if (job.status === 'completed') {
          stopPolling(key);
          updateTask(key, {
            status: 'completed',
            progress: 100,
            result: task?.result_data ?? null
          });
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          stopPolling(key);
          updateTask(key, {
            status: job.status,
            error: job.error_message || task?.error_message || '任务失败'
          });
        }
      } catch (err: any) {
        stopPolling(key);
        updateTask(key, {
          status: 'failed',
          error: err.message || '轮询失败'
        });
      }
    };

    // 立即查一次
    poll();
    timersRef.current[key] = setInterval(poll, interval);
  }, [interval, stopPolling, updateTask]);

  /**
   * 启动任务
   * @param key 唯一标识（如 scene id），用于跟踪状态
   * @param workflowType 工作流类型（如 'frame_generation'）
   * @param params 业务参数
   * @returns jobId
   */
  const runTask = useCallback(async (
    key: string,
    workflowType: string,
    params: Record<string, any>
  ): Promise<number> => {
    // 初始化状态
    updateTask(key, {
      jobId: 0,
      status: 'pending',
      progress: 0,
      result: null,
      error: null
    });

    const { jobId } = await startWorkflow(workflowType, projectId, params);

    updateTask(key, { jobId, status: 'running' });
    startPolling(key, jobId);

    return jobId;
  }, [projectId, updateTask, startPolling]);

  // 清除某个任务的状态
  const clearTask = useCallback((key: string) => {
    stopPolling(key);
    setTasks(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [stopPolling]);

  // 是否有任何任务在运行
  const isRunning = (Object.values(tasks) as TaskState[]).some(
    t => t.status === 'pending' || t.status === 'running'
  );

  return {
    tasks,
    runTask,
    clearTask,
    stopPolling,
    isRunning
  };
}
