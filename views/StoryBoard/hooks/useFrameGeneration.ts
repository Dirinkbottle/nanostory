/**
 * 首尾帧生成轮询 Hook
 * 监听 frame_generation 和 single_frame_generation 工作流
 * 自动更新分镜的首尾帧 URL
 */

import { useState, useEffect, useCallback } from 'react';
import { useWorkflow } from '../../../hooks/useWorkflow';
import { getAuthToken } from '../../../services/auth';

interface UseFrameGenerationProps {
  sceneId: number | null;
  projectId: number | null;
  isActive: boolean;
  onComplete?: () => void;
}

interface FrameGenerationState {
  isGenerating: boolean;
  generatingJobId: number | null;
  generatingSceneId: number | null;
  job: any;
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

export function useFrameGeneration({
  sceneId,
  projectId,
  isActive,
  onComplete
}: UseFrameGenerationProps): FrameGenerationState {
  const [generatingJobId, setGeneratingJobId] = useState<number | null>(null);
  const [generatingSceneId, setGeneratingSceneId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 使用 useWorkflow 监听工作流状态
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(generatingJobId);

  // 检查并恢复正在进行的工作流
  const checkAndResumeWorkflow = useCallback(async () => {
    if (!projectId || !isActive) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/workflows?projectId=${projectId}&status=pending,running&limit=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) return;

      const data = await res.json();
      const jobs = data.jobs || [];

      // 查找首尾帧生成工作流
      const frameJob = jobs.find((j: any) => 
        j.workflow_type === 'frame_generation' || j.workflow_type === 'single_frame_generation'
      );

      if (frameJob) {
        console.log('[useFrameGeneration] 发现首尾帧生成工作流:', frameJob);
        
        const jobParams = typeof frameJob.input_params === 'string'
          ? JSON.parse(frameJob.input_params)
          : frameJob.input_params;
        
        const targetSceneId = jobParams?.jobParams?.storyboardId?.toString() || null;
        console.log('[useFrameGeneration] 正在生成的场景 ID:', targetSceneId);

        setGeneratingJobId(frameJob.id);
        setGeneratingSceneId(targetSceneId);
        setIsGenerating(true);
      } else {
        setGeneratingJobId(null);
        setGeneratingSceneId(null);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('[useFrameGeneration] 检查工作流失败:', error);
    }
  }, [projectId, isActive]);

  // 组件挂载时检查是否有正在进行的工作流
  useEffect(() => {
    checkAndResumeWorkflow();
  }, [checkAndResumeWorkflow]);

  // 监听工作流完成
  useEffect(() => {
    if (!job) return;

    if (isCompleted) {
      console.log('[useFrameGeneration] 首尾帧生成完成');
      
      // 从 result_data 中提取首尾帧 URL
      const tasks = job.tasks || [];
      if (tasks.length > 0) {
        const lastTask = tasks[tasks.length - 1];
        const resultData = typeof lastTask.result_data === 'string'
          ? JSON.parse(lastTask.result_data)
          : lastTask.result_data;

        console.log('[useFrameGeneration] 生成结果:', resultData);
      }

      // 触发完成回调
      if (onComplete) {
        onComplete();
      }

      // 重置状态
      setIsGenerating(false);
      setGeneratingSceneId(null);
      setGeneratingJobId(null);
    } else if (isFailed) {
      console.error('[useFrameGeneration] 首尾帧生成失败');
      alert('首尾帧生成失败，请重试');
      
      setIsGenerating(false);
      setGeneratingSceneId(null);
      setGeneratingJobId(null);
    }
  }, [job, isCompleted, isFailed, onComplete]);

  return {
    isGenerating,
    generatingJobId,
    generatingSceneId,
    job,
    isRunning,
    isCompleted,
    isFailed
  };
}
