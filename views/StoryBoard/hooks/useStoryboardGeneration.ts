/**
 * 分镜生成 Hook
 * 负责分镜生成和工作流轮询
 */

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, consumeWorkflow } from '../../../hooks/useWorkflow';

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

  // 监听 generatingJobId 变化
  useEffect(() => {
    console.log('[useStoryboardGeneration] generatingJobId 变化:', generatingJobId);
  }, [generatingJobId]);

  // 检查并恢复下一个活跃工作流（只在分镜页面激活时执行）
  const checkAndResumeNextWorkflow = async () => {
    if (!projectId || !isActive) {
      console.log('[useStoryboardGeneration] 页面未激活或无 projectId，跳过检查');
      return;
    }
    
    try {
      console.log('[useStoryboardGeneration] 检查项目的分镜生成工作流...');
      const { getActiveWorkflows } = await import('../../../hooks/useWorkflow');
      const { jobs } = await getActiveWorkflows(projectId);
      
      if (jobs && jobs.length > 0) {
        // 只处理分镜生成的工作流
        const storyboardJob = jobs.find((j: any) => j.workflow_type === 'storyboard_generation');
        
        if (storyboardJob) {
          console.log('[useStoryboardGeneration] 发现分镜生成工作流:', storyboardJob);
          setGeneratingJobId(storyboardJob.id);
          setIsGenerating(true);
        } else {
          console.log('[useStoryboardGeneration] 没有分镜生成工作流（可能是其他类型）');
          setGeneratingJobId(null);
          setIsGenerating(false);
        }
      } else {
        console.log('[useStoryboardGeneration] 没有活跃工作流');
        setGeneratingJobId(null);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('[useStoryboardGeneration] 检查活跃工作流失败:', error);
    }
  };

  // 页面加载时检查是否有未完成的工作流（只在激活时）
  useEffect(() => {
    if (isActive) {
      checkAndResumeNextWorkflow();
    }
  }, [projectId, isActive]);

  // 使用 useWorkflow 轮询工作流状态
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(generatingJobId, {
    onCompleted: async (completedJob) => {
      console.log('[useStoryboardGeneration] 工作流完成:', completedJob);
      
      try {
        // 标记工作流已消费（分镜已在工作流内 save_storyboards 步骤中保存到 DB）
        await consumeWorkflow(completedJob.id);

        alert('分镜生成完成！');
        
        // 通知完成
        onComplete();
        
        // 检查是否还有其他活跃工作流
        console.log('[useStoryboardGeneration] 检查是否有其他活跃工作流...');
        await checkAndResumeNextWorkflow();
      } catch (error: any) {
        alert('处理工作流结果失败: ' + error.message);
        await checkAndResumeNextWorkflow();
      } finally {
        setIsGenerating(false);
      }
    },
    onFailed: async (failedJob) => {
      alert('分镜生成失败: ' + (failedJob.error_message || '未知错误'));
      
      try {
        await consumeWorkflow(failedJob.id);
      } catch (error) {
        console.error('标记工作流消费失败:', error);
      }
      
      // 检查是否还有其他活跃工作流
      console.log('[useStoryboardGeneration] 检查是否有其他活跃工作流...');
      await checkAndResumeNextWorkflow();
      
      setIsGenerating(false);
    }
  });

  // 启动分镜生成
  const startGeneration = async (textModel: string) => {
    if (!scriptId) {
      alert('请先选择或生成一个剧本');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('[useStoryboardGeneration] 启动分镜生成工作流, scriptId:', scriptId);
      
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

      console.log('[useStoryboardGeneration] 工作流启动成功:', data);
      
      // 启动工作流轮询
      setGeneratingJobId(data.jobId);
      
      alert('分镜生成已启动，请等待完成...');
    } catch (error: any) {
      alert(error.message || '自动生成分镜失败');
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    startGeneration
  };
}
