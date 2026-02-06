/**
 * 场景提取 Hook
 * 负责管理场景提取工作流的启动、轮询和状态管理
 */

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, getActiveWorkflows, consumeWorkflow } from '../../../hooks/useWorkflow';

interface UseSceneExtractionProps {
  projectId: number | null;
  scriptId: number | null;
  scenes: any[];
  isActive: boolean;
  onCompleted?: () => void;
}

export function useSceneExtraction({
  projectId,
  scriptId,
  scenes,
  isActive,
  onCompleted
}: UseSceneExtractionProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingJobId, setExtractingJobId] = useState<number | null>(null);

  // 检查并恢复未完成的场景提取工作流
  const checkAndResumeNextWorkflow = async () => {
    if (!projectId) return;
    
    try {
      console.log('[useSceneExtraction] 检查项目的场景提取工作流...');
      const { jobs } = await getActiveWorkflows(projectId);
      
      if (jobs && jobs.length > 0) {
        const sceneJob = jobs.find(
          (j: any) => j.workflow_type === 'scene_extraction' && 
                     (j.status === 'pending' || j.status === 'running' || 
                      (j.status === 'completed' && !j.is_consumed))
        );

        if (sceneJob) {
          console.log('[useSceneExtraction] 发现活跃的场景提取工作流:', sceneJob.id);
          setExtractingJobId(sceneJob.id);
          setIsExtracting(true);
        }
      }
    } catch (error) {
      console.error('[useSceneExtraction] 检查活跃工作流失败:', error);
    }
  };

  useEffect(() => {
    if (isActive) {
      checkAndResumeNextWorkflow();
    }
  }, [projectId, isActive]);

  // 使用 useWorkflow 轮询工作流状态
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(extractingJobId, {
    onCompleted: async (completedJob) => {
      console.log('[useSceneExtraction] 工作流完成:', completedJob);
      
      try {
        await consumeWorkflow(completedJob.id);
        alert('场景提取完成！');
        
        if (onCompleted) {
          onCompleted();
        }
        
        await checkAndResumeNextWorkflow();
      } catch (error: any) {
        console.error('[useSceneExtraction] 处理完成失败:', error);
        alert('场景提取完成，但处理结果时出错: ' + error.message);
        await checkAndResumeNextWorkflow();
      } finally {
        setIsExtracting(false);
      }
    },
    onFailed: async (failedJob) => {
      console.error('[useSceneExtraction] 工作流失败:', failedJob);
      alert('场景提取失败，请重试');
      setIsExtracting(false);
      
      try {
        await consumeWorkflow(failedJob.id);
      } catch (error) {
        console.error('[useSceneExtraction] 消费失败工作流出错:', error);
      }
      
      await checkAndResumeNextWorkflow();
    }
  });

  // 启动场景提取
  const startExtraction = async () => {
    if (!scriptId || !projectId || scenes.length === 0) {
      alert('请先生成分镜');
      return;
    }

    try {
      setIsExtracting(true);
      
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/extract-scenes/${scriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          modelName: 'DeepSeek Chat'
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '启动场景提取失败');
      }

      const data = await res.json();
      console.log('[useSceneExtraction] 场景提取已启动:', data.jobId);
      setExtractingJobId(data.jobId);
    } catch (error: any) {
      console.error('[useSceneExtraction] 启动场景提取失败:', error);
      alert('启动场景提取失败: ' + error.message);
      setIsExtracting(false);
    }
  };

  return {
    isExtracting,
    extractingJobId,
    job,
    isRunning,
    isCompleted,
    isFailed,
    startExtraction,
    checkAndResumeNextWorkflow
  };
}
