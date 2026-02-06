/**
 * 角色提取 Hook
 * 负责管理角色提取工作流的启动、轮询和状态管理
 */

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, getActiveWorkflows, consumeWorkflow } from '../../../hooks/useWorkflow';

interface UseCharacterExtractionProps {
  projectId: number | null;
  scriptId: number | null;
  scenes: any[];
  isActive: boolean;  // 是否激活（当前页面是否可见）
  onCompleted?: () => void;  // 完成回调
}

export function useCharacterExtraction({
  projectId,
  scriptId,
  scenes,
  isActive,
  onCompleted
}: UseCharacterExtractionProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingJobId, setExtractingJobId] = useState<number | null>(null);

  // 检查并恢复未完成的角色提取工作流
  const checkAndResumeNextWorkflow = async () => {
    if (!projectId) return;
    
    try {
      console.log('[useCharacterExtraction] 检查项目的角色提取工作流...');
      const { jobs } = await getActiveWorkflows(projectId);
      
      if (jobs && jobs.length > 0) {
        // 查找角色提取工作流
        const characterJob = jobs.find(
          (j: any) => j.workflow_type === 'character_extraction' && 
                     (j.status === 'pending' || j.status === 'running' || 
                      (j.status === 'completed' && !j.is_consumed))
        );

        if (characterJob) {
          console.log('[useCharacterExtraction] 发现活跃的角色提取工作流:', characterJob.id);
          setExtractingJobId(characterJob.id);
          setIsExtracting(true);
        }
      }
    } catch (error) {
      console.error('[useCharacterExtraction] 检查活跃工作流失败:', error);
    }
  };

  // 页面加载时检查是否有未完成的工作流（只在激活时）
  useEffect(() => {
    if (isActive) {
      checkAndResumeNextWorkflow();
    }
  }, [projectId, isActive]);

  // 使用 useWorkflow 轮询工作流状态
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(extractingJobId, {
    onCompleted: async (completedJob) => {
      console.log('[useCharacterExtraction] 工作流完成:', completedJob);
      
      try {
        // 标记工作流已消费
        await consumeWorkflow(completedJob.id);
        console.log('[useCharacterExtraction] 工作流已标记为已消费');

        // 重置状态
        setIsExtracting(false);
        setExtractingJobId(null);

        // 调用完成回调
        if (onCompleted) {
          onCompleted();
        }

        // 提示用户
        alert('角色提取完成！请在资源管理器中查看详细信息。');
      } catch (error) {
        console.error('[useCharacterExtraction] 处理完成回调失败:', error);
      }
    },
    onFailed: (failedJob) => {
      console.error('[useCharacterExtraction] 工作流失败:', failedJob);
      setIsExtracting(false);
      setExtractingJobId(null);
      alert('角色提取失败: ' + (failedJob.error_message || '未知错误'));
    },
    onProgress: (progressJob) => {
      console.log('[useCharacterExtraction] 进度:', progressJob.current_step_index, '/', progressJob.total_steps);
    }
  });

  // 启动角色提取
  const startExtraction = async () => {
    if (!projectId || !scriptId || scenes.length === 0) {
      alert('请先生成分镜');
      return;
    }

    setIsExtracting(true);

    try {
      const token = getAuthToken();
      
      // 1. 先保存分镜中已有的角色名称到数据库
      const localCharacters = [...new Set(scenes.flatMap(s => s.characters || []))];
      
      if (localCharacters.length > 0) {
        console.log('[useCharacterExtraction] 保存本地角色:', localCharacters);
        
        const batchRes = await fetch('/api/characters/batch-save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            projectId,
            scriptId,
            characters: localCharacters
          })
        });

        if (batchRes.ok) {
          const batchData = await batchRes.json();
          console.log('[useCharacterExtraction] 本地角色保存成功:', batchData);
        }
      }
      
      // 2. 准备分镜数据
      const scenesData = scenes.map(scene => ({
        description: scene.description,
        characters: scene.characters,
        dialogue: scene.dialogue,
        location: scene.location
      }));

      // 3. 启动 AI 工作流提取详细信息
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          workflowType: 'character_extraction',
          projectId,
          params: {
            scenes: scenesData,
            projectId,
            scriptId,
            modelName: 'DeepSeek Chat'
          }
        })
      });
      
      console.log('[useCharacterExtraction] 提取参数:', {
        projectId,
        scriptId,
        localCharactersCount: localCharacters.length,
        scenesCount: scenesData.length
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '启动角色提取失败');
      }

      const { jobId } = await res.json();
      console.log('[useCharacterExtraction] 角色提取工作流已启动:', jobId);

      // 设置 jobId 开始轮询
      setExtractingJobId(jobId);

      alert(`已保存 ${localCharacters.length} 个角色，AI 正在提取详细信息...`);
      
    } catch (error: any) {
      console.error('[useCharacterExtraction] 启动失败:', error);
      alert('启动角色提取失败: ' + error.message);
      setIsExtracting(false);
    }
  };

  return {
    isExtracting: isExtracting || isRunning,
    job,
    startExtraction,
    progress: job?.current_step_index || 0,
    totalSteps: job?.total_steps || 0
  };
}
