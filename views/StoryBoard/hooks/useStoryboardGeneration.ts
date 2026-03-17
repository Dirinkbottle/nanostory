/**
 * 分镜生成 Hook
 * 负责分镜生成和工作流轮询，提供实时进度信息
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, consumeWorkflow } from '../../../hooks/useWorkflow';
import { useToast } from '../../../contexts/ToastContext';

// 步骤名称映射（用于用户友好展示）
const STEP_NAMES: Record<string, string> = {
  storyboard_generation: '生成分镜结构',
  scene_storyboard_generation: '生成场景分镜',
  batch_storyboard_generation: '批量分镜生成',
  batch_frame_generation: '批量帧图片生成',
  save_storyboards: '保存分镜数据',
  character_extraction: '提取角色信息',
  scene_state_analysis: '分析场景状态',
  frame_generation: '生成首尾帧',
  single_frame_generation: '生成单帧'
};

export interface GenerationProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepStatus: 'pending' | 'processing' | 'completed' | 'failed';
  overallProgress: number; // 0-100
}

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
        // 检查所有分镜生成相关的工作流类型
        const storyboardJob = jobs.find((j: any) => 
          j.workflow_type === 'storyboard_generation' || 
          j.workflow_type === 'scene_storyboard_generation' ||
          j.workflow_type === 'batch_storyboard_generation'
        );
        
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
    // 进度回调：每次轮询更新时触发
    onProgress: (progressJob) => {
      // 进度信息通过 job 对象传递，无需额外处理
    },
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
  const startGeneration = useCallback(async (textModel: string, byScene: boolean = false) => {
    if (!scriptId) {
      showToast('请先选择或生成一个剧本', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const token = getAuthToken();
      // 根据 byScene 参数选择不同的 API
      const apiUrl = byScene 
        ? `/api/storyboards/auto-generate-by-scene/${scriptId}`
        : `/api/storyboards/auto-generate/${scriptId}`;
        
      const res = await fetch(apiUrl, {
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

      // 启动工作流轮询 - 统一处理，无论哪种模式都返回单个 jobId
      setGeneratingJobId(data.jobId);
      showToast(`分镜生成已启动（共 ${data.totalScenes || 1} 个场景），请等待完成...`, 'info');
    } catch (error: any) {
      showToast(error.message || '自动生成分镜失败', 'error');
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [scriptId, showToast]);

  // 计算实时进度信息
  const progress = useMemo<GenerationProgress | null>(() => {
    if (!job || !job.tasks || job.tasks.length === 0) return null;
    
    const tasks = job.tasks;
    const totalSteps = tasks.length;
    
    // 找到当前正在执行或下一个pending的步骤
    let currentTask = tasks.find((t: any) => t.status === 'processing');
    if (!currentTask) {
      currentTask = tasks.find((t: any) => t.status === 'pending');
    }
    if (!currentTask) {
      // 所有都完成了
      currentTask = tasks[tasks.length - 1];
    }
    
    const currentStep = (currentTask?.step_index ?? 0) + 1;
    const taskType = currentTask?.task_type || '';
    const stepName = STEP_NAMES[taskType] || taskType;
    const stepStatus = currentTask?.status || 'pending';
    
    // 计算总体进度
    const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
    const processingTask = tasks.find((t: any) => t.status === 'processing');
    const processingProgress = processingTask?.progress || 0;
    
    // 每个步骤占 100/totalSteps %，当前步骤按其 progress 比例计算
    const overallProgress = Math.round(
      (completedCount / totalSteps) * 100 + 
      (processingProgress / 100) * (100 / totalSteps)
    );
    
    return {
      currentStep,
      totalSteps,
      stepName,
      stepStatus,
      overallProgress: Math.min(overallProgress, 99) // 完成前最多99%
    };
  }, [job]);

  return {
    isGenerating,
    startGeneration,
    progress, // 新增：实时进度信息
    job // 新增：原始 job 对象，供高级用途
  };
}
