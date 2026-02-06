/**
 * 角色三视图生成 Hook
 * 负责三视图生成和工作流轮询
 */

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, consumeWorkflow } from '../../../hooks/useWorkflow';

interface UseCharacterViewsGenerationProps {
  characterId: string | null;
  projectId: number | null;
  isActive: boolean; // 是否在资源面板页面
  onComplete: () => void;
}

export function useCharacterViewsGeneration({
  characterId,
  projectId,
  isActive,
  onComplete
}: UseCharacterViewsGenerationProps) {
  const [generatingJobId, setGeneratingJobId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 监听 generatingJobId 变化
  useEffect(() => {
    console.log('[useCharacterViewsGeneration] generatingJobId 变化:', generatingJobId);
  }, [generatingJobId]);

  // 检查并恢复下一个活跃工作流（只在页面激活时执行）
  const checkAndResumeNextWorkflow = async () => {
    if (!projectId || !isActive) {
      console.log('[useCharacterViewsGeneration] 页面未激活或无 projectId，跳过检查');
      return;
    }
    
    try {
      console.log('[useCharacterViewsGeneration] 检查项目的三视图生成工作流...');
      const { getActiveWorkflows } = await import('../../../hooks/useWorkflow');
      const { jobs } = await getActiveWorkflows(projectId);
      
      if (jobs && jobs.length > 0) {
        // 只处理角色三视图生成的工作流
        const viewsJob = jobs.find((j: any) => j.workflow_type === 'character_views_generation');
        
        if (viewsJob) {
          console.log('[useCharacterViewsGeneration] 发现三视图生成工作流:', viewsJob);
          setGeneratingJobId(viewsJob.id);
          setIsGenerating(true);
        } else {
          console.log('[useCharacterViewsGeneration] 没有三视图生成工作流（可能是其他类型）');
          setGeneratingJobId(null);
          setIsGenerating(false);
        }
      } else {
        console.log('[useCharacterViewsGeneration] 没有活跃工作流');
        setGeneratingJobId(null);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('[useCharacterViewsGeneration] 检查活跃工作流失败:', error);
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
      console.log('[useCharacterViewsGeneration] 工作流完成:', completedJob);
      
      try {
        // 从工作流参数中获取角色 ID
        const workflowParams = typeof completedJob.input_params === 'string' 
          ? JSON.parse(completedJob.input_params) 
          : completedJob.input_params;
        const targetCharacterId = workflowParams?.characterId || characterId;
        
        console.log('[useCharacterViewsGeneration] 角色 ID:', targetCharacterId);
        console.log('[useCharacterViewsGeneration] 工作流参数:', workflowParams);
        
        // 标记工作流已消费
        await consumeWorkflow(completedJob.id);

        alert('三视图生成完成！');
        
        // 通知完成（刷新角色数据）
        onComplete();
        
        // 检查是否还有其他活跃工作流
        console.log('[useCharacterViewsGeneration] 检查是否有其他活跃工作流...');
        await checkAndResumeNextWorkflow();
      } catch (error: any) {
        console.error('[useCharacterViewsGeneration] 处理完成失败:', error);
        alert('三视图生成完成，但处理结果时出错: ' + error.message);
        // 即使处理失败，也检查下一个工作流
        await checkAndResumeNextWorkflow();
      } finally {
        setIsGenerating(false);
      }
    },
    onFailed: async (failedJob) => {
      console.error('[useCharacterViewsGeneration] 工作流失败:', failedJob);
      alert('三视图生成失败，请重试');
      setIsGenerating(false);
      
      // 标记工作流已消费
      try {
        await consumeWorkflow(failedJob.id);
      } catch (error) {
        console.error('[useCharacterViewsGeneration] 消费失败工作流出错:', error);
      }
      
      // 检查是否还有其他活跃工作流
      await checkAndResumeNextWorkflow();
    }
  });

  return {
    isGenerating,
    generatingJobId,
    job,
    isRunning,
    isCompleted,
    isFailed,
    checkAndResumeNextWorkflow
  };
}
