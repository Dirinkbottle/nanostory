/**
 * 通用工作流恢复 Hook
 * 
 * 封装 useWorkflow + getActiveWorkflows 的通用模式：
 * 1. 页面加载时自动检查并恢复未消费的工作流
 * 2. 自动轮询进度
 * 3. 完成/失败时自动 consumeWorkflow
 * 4. 支持链式恢复（处理完一个工作流后检查下一个）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useWorkflow,
  getActiveWorkflows,
  consumeWorkflow,
  WorkflowJob
} from '../../../hooks/useWorkflow';

interface UseWorkflowRecoveryOptions {
  /** 项目 ID */
  projectId: number | null;
  /** 要匹配的 workflow_type（支持多个） */
  workflowTypes: string[];
  /** 是否激活（页面可见时才轮询） */
  isActive?: boolean;
  /** 工作流完成回调 */
  onCompleted?: (job: WorkflowJob) => void;
  /** 工作流失败回调 */
  onFailed?: (job: WorkflowJob) => void;
  /** 日志前缀 */
  logPrefix?: string;
}

export function useWorkflowRecovery({
  projectId,
  workflowTypes,
  isActive = true,
  onCompleted,
  onFailed,
  logPrefix = '[WorkflowRecovery]'
}: UseWorkflowRecoveryOptions) {
  const [jobId, setJobId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 用 ref 保持回调最新，避免 useWorkflow 闭包过期
  const callbackRefs = useRef({ onCompleted, onFailed });
  useEffect(() => {
    callbackRefs.current = { onCompleted, onFailed };
  }, [onCompleted, onFailed]);

  // 检查并恢复活跃工作流
  const checkAndResume = useCallback(async () => {
    if (!projectId || !isActive) {
      return;
    }

    try {
      console.log(`${logPrefix} 检查活跃工作流...`);
      const { jobs } = await getActiveWorkflows(projectId);

      if (jobs && jobs.length > 0) {
        const matchedJob = jobs.find((j: any) => workflowTypes.includes(j.workflow_type));

        if (matchedJob) {
          console.log(`${logPrefix} 恢复工作流:`, matchedJob.id, matchedJob.workflow_type);
          setJobId(matchedJob.id);
          setIsGenerating(true);
          return;
        }
      }

      console.log(`${logPrefix} 无活跃工作流`);
      setJobId(null);
      setIsGenerating(false);
    } catch (error) {
      console.error(`${logPrefix} 检查活跃工作流失败:`, error);
    }
  }, [projectId, isActive, workflowTypes, logPrefix]);

  // 页面加载 / isActive 变化时自动检查
  useEffect(() => {
    if (isActive && projectId) {
      checkAndResume();
    }
  }, [projectId, isActive]);

  // 使用 useWorkflow 轮询
  const workflow = useWorkflow(jobId, {
    onCompleted: async (completedJob) => {
      console.log(`${logPrefix} 工作流完成:`, completedJob.id);
      try {
        await consumeWorkflow(completedJob.id);
        callbackRefs.current.onCompleted?.(completedJob);
      } catch (error: any) {
        console.error(`${logPrefix} 处理完成失败:`, error);
      } finally {
        setIsGenerating(false);
        setJobId(null);
        // 链式检查下一个
        await checkAndResume();
      }
    },
    onFailed: async (failedJob) => {
      console.error(`${logPrefix} 工作流失败:`, failedJob.id);
      try {
        await consumeWorkflow(failedJob.id);
      } catch (e) {
        console.error(`${logPrefix} consume 失败:`, e);
      }
      callbackRefs.current.onFailed?.(failedJob);
      setIsGenerating(false);
      setJobId(null);
      await checkAndResume();
    }
  });

  // 手动启动新任务（设置 jobId 后自动开始轮询）
  const startJob = useCallback((newJobId: number) => {
    setJobId(newJobId);
    setIsGenerating(true);
  }, []);

  return {
    ...workflow,
    isGenerating,
    jobId,
    startJob,
    checkAndResume
  };
}
