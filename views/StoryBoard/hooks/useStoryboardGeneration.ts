/**
 * 分镜生成 Hook
 * 负责分镜生成和工作流轮询
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, consumeWorkflow } from '../../../hooks/useWorkflow';
import { useToast } from '../../../contexts/ToastContext';

interface UseStoryboardGenerationProps {
  scriptId: number | null;
  projectId: number | null;
  isActive: boolean; // 是否在分镜页面
  onComplete: () => void;
}

export function useStoryboardGeneration({
  scriptId,
  projectId,
  isActive,
  onComplete
}: UseStoryboardGenerationProps) {
  const [generatingJobId, setGeneratingJobId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const isMountedRef = useRef(true);
  const { showToast } = useToast();

  // 组件卸载时标记
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 监听 generatingJobId 变化
  useEffect(() => {
    // debug log removed for cleaner output
  }, [generatingJobId]);

  // 检查并恢复下一个活跃工作流（只在分镜页面激活时执行）
  const checkAndResumeNextWorkflow = useCallback(async () => {
    if (!projectId || !isActive || !isMountedRef.current) {
      return;
    }
    
    try {
      const { getActiveWorkflows } = await import('../../../hooks/useWorkflow');
      const { jobs } = await getActiveWorkflows(projectId);
      
      if (!isMountedRef.current) return;
      
      if (jobs && jobs.length > 0) {
        const storyboardJob = jobs.find((j: any) => j.workflow_type === 'storyboard_generation');
        
        if (storyboardJob) {
          setGeneratingJobId(storyboardJob.id);
          setIsGenerating(true);
        } else {
          setGeneratingJobId(null);
          setIsGenerating(false);
        }
      } else {
        setGeneratingJobId(null);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('[useStoryboardGeneration] 检查活跃工作流失败:', error);
    }
  }, [projectId, isActive]);

  // 页面加载时检查是否有未完成的工作流（只在激活时）
  useEffect(() => {
    if (isActive) {
      checkAndResumeNextWorkflow();
    }
  }, [isActive, checkAndResumeNextWorkflow]);

  // 使用 useWorkflow 轮询工作流状态
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(generatingJobId, {
    onCompleted: async (completedJob) => {
      try {
        await consumeWorkflow(completedJob.id);
        showToast('分镜生成完成！', 'success');
        onComplete();
        if (isMountedRef.current) {
          await checkAndResumeNextWorkflow();
        }
      } catch (error: any) {
        showToast('处理工作流结果失败: ' + error.message, 'error');
        if (isMountedRef.current) {
          await checkAndResumeNextWorkflow();
        }
      } finally {
        if (isMountedRef.current) {
          setIsGenerating(false);
        }
      }
    },
    onFailed: async (failedJob) => {
      showToast('分镜生成失败: ' + (failedJob.error_message || '未知错误'), 'error');
      
      try {
        await consumeWorkflow(failedJob.id);
      } catch (error) {
        console.error('标记工作流消费失败:', error);
      }
      
      if (isMountedRef.current) {
        await checkAndResumeNextWorkflow();
        setIsGenerating(false);
      }
    }
  });

  // 启动分镜生成
  const startGeneration = useCallback(async (textModel: string) => {
    if (!scriptId) {
      showToast('请先选择或生成一个剧本', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/auto-generate/${scriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ textModel })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      // 启动工作流轮询
      setGeneratingJobId(data.jobId);
      showToast('分镜生成已启动，请等待完成...', 'info');
    } catch (error: any) {
      showToast(error.message || '自动生成分镜失败', 'error');
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [scriptId, showToast]);

  return {
    isGenerating,
    startGeneration
  };
}
