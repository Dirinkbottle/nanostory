/**
 * 分镜生成 Hook
 * 负责分镜生成和工作流轮询，提供实时进度信息
 */

import { useCallback, useMemo } from 'react';
import { getAuthToken } from '../../../services/auth';
import { ApiError } from '../../../hooks/useWorkflow';
import { useToast } from '../../../contexts/ToastContext';
import { useWorkflowRecovery } from './useWorkflowRecovery';

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
  const { showToast } = useToast();

  const recovery = useWorkflowRecovery({
    projectId,
    workflowTypes: ['storyboard_generation', 'scene_storyboard_generation', 'batch_storyboard_generation'],
    isActive,
    matchJob: (job) => {
      if (!scriptId) {
        return true;
      }

      return Number(job.input_params?.scriptId) === scriptId;
    },
    onCompleted: async () => {
      showToast('分镜生成完成！', 'success');
      onComplete();
    },
    onFailed: (failedJob) => {
      showToast('分镜生成失败: ' + (failedJob.error_message || '未知错误'), 'error');
    },
    logPrefix: '[useStoryboardGeneration]'
  });

  // 启动分镜生成
  const startGeneration = useCallback(async (textModel: string, byScene: boolean = false) => {
    if (!scriptId) {
      showToast('请先选择或生成一个剧本', 'warning');
      return;
    }
    if (recovery.isGenerating) {
      showToast('当前已有分镜生成任务正在进行中', 'warning');
      return;
    }

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
        if (res.status === 409 && data.jobId) {
          recovery.startJob(data.jobId);
          showToast('已恢复进行中的分镜生成任务', 'info');
          return;
        }

        throw new ApiError(data.message || '生成失败', res.status, data);
      }

      // 启动工作流轮询 - 统一处理，无论哪种模式都返回单个 jobId
      recovery.startJob(data.jobId);
      showToast(`分镜生成已启动（共 ${data.totalScenes || 1} 个场景），请等待完成...`, 'info');
    } catch (error: any) {
      showToast(error.message || '自动生成分镜失败', 'error');
    }
  }, [scriptId, showToast, recovery]);

  // 计算实时进度信息
  const progress = useMemo<GenerationProgress | null>(() => {
    if (!recovery.job || !recovery.job.tasks || recovery.job.tasks.length === 0) return null;
    
    const tasks = recovery.job.tasks;
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
  }, [recovery.job]);

  return {
    isGenerating: recovery.isGenerating,
    startGeneration,
    progress, // 新增：实时进度信息
    job: recovery.job // 新增：原始 job 对象，供高级用途
  };
}
