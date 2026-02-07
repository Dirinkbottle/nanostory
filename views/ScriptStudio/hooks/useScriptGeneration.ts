/**
 * 剧本生成 Hook
 * 负责剧本生成和工作流轮询
 */

import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow, consumeWorkflow } from '../../../hooks/useWorkflow';
import { Project, createProject } from '../../../services/projects';

const LAST_PROJECT_KEY = 'nanostory_last_project_id';

interface UseScriptGenerationProps {
  selectedProject: Project | null;
  setSelectedProject: (project: Project) => void;
  loadProjectScript: (projectId: number, episode?: number) => Promise<void>;
}

export function useScriptGeneration({
  selectedProject,
  setSelectedProject,
  loadProjectScript
}: UseScriptGenerationProps) {
  const [generatingJobId, setGeneratingJobId] = useState<number | null>(null);
  const [generatingScriptId, setGeneratingScriptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);

  // 监听 generatingJobId 变化
  useEffect(() => {
    console.log('[useScriptGeneration] generatingJobId 变化:', generatingJobId);
  }, [generatingJobId]);

  // 检查并恢复下一个活跃工作流（只处理剧本生成类型）
  const checkAndResumeNextWorkflow = async () => {
    if (!selectedProject) return;
    
    try {
      console.log('[useScriptGeneration] 检查项目的剧本生成工作流...');
      const { getActiveWorkflows } = await import('../../../hooks/useWorkflow');
      const { jobs } = await getActiveWorkflows(selectedProject.id);
      
      if (jobs && jobs.length > 0) {
        // 只处理 script_only 类型的工作流
        const scriptJob = jobs.find((j: any) => j.workflow_type === 'script_only');
        
        if (scriptJob) {
          console.log('[useScriptGeneration] 发现剧本生成工作流:', scriptJob);
          
          // 查找对应的 script 记录
          const token = getAuthToken();
          const res = await fetch(`/api/scripts/project/${selectedProject.id}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            const generatingScript = data.scripts?.find((s: any) => s.status === 'generating');
            
            if (generatingScript) {
              console.log('[useScriptGeneration] 恢复工作流轮询:', scriptJob.id, 'scriptId:', generatingScript.id);
              setGeneratingJobId(scriptJob.id);
              setGeneratingScriptId(generatingScript.id);
            } else {
              // 没有对应的生成中剧本，清空状态
              console.log('[useScriptGeneration] 没有生成中的剧本，清空状态');
              setGeneratingJobId(null);
              setGeneratingScriptId(null);
            }
          }
        } else {
          console.log('[useScriptGeneration] 没有剧本生成工作流（可能是其他类型）');
          setGeneratingJobId(null);
          setGeneratingScriptId(null);
        }
      } else {
        console.log('[useScriptGeneration] 没有活跃工作流');
        setGeneratingJobId(null);
        setGeneratingScriptId(null);
      }
    } catch (error) {
      console.error('[useScriptGeneration] 检查活跃工作流失败:', error);
    }
  };

  // 页面加载时检查是否有未完成的工作流
  useEffect(() => {
    checkAndResumeNextWorkflow();
  }, [selectedProject]);

  // 使用 useWorkflow 轮询工作流状态
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(generatingJobId, {
    onCompleted: async (completedJob) => {
      console.log('[useScriptGeneration] 工作流完成回调触发:', completedJob);
      
      if (!generatingScriptId) {
        console.warn('[useScriptGeneration] generatingScriptId 为空，跳过保存');
        return;
      }
      
      try {
        console.log('[useScriptGeneration] 开始保存工作流结果...');
        // 保存工作流结果到 scripts 表
        const token = getAuthToken();
        const res = await fetch('/api/scripts/save-from-workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            scriptId: generatingScriptId,
            jobId: completedJob.id
          })
        });

        const data = await res.json();
        console.log('[useScriptGeneration] 保存响应:', data);
        
        if (res.status === 402) {
          alert(`余额不足！需要: ¥${data.required.toFixed(4)}, 当前: ¥${data.current.toFixed(2)}`);
          return;
        }

        if (!res.ok) {
          throw new Error(data.message || '保存失败');
        }

        console.log('[useScriptGeneration] 保存成功，刷新剧本列表...');
        // 刷新剧本列表
        if (selectedProject) {
          await loadProjectScript(selectedProject.id, data.episodeNumber);
        }
        
        console.log('[useScriptGeneration] 标记工作流已消费...');
        // 标记工作流已消费
        await consumeWorkflow(completedJob.id);
        
        console.log('[useScriptGeneration] 完成！');
        alert(`第${data.episodeNumber}集生成成功！`);
        
        // 检查是否还有其他活跃工作流
        console.log('[useScriptGeneration] 检查是否有其他活跃工作流...');
        await checkAndResumeNextWorkflow();
      } catch (error: any) {
        alert('保存剧本失败: ' + error.message);
        // 即使保存失败，也检查下一个工作流
        await checkAndResumeNextWorkflow();
      } finally {
        setLoading(false);
      }
    },
    onFailed: async (failedJob) => {
      alert('剧本生成失败: ' + (failedJob.error_message || '未知错误'));
      
      // 失败的工作流也标记为已消费
      try {
        await consumeWorkflow(failedJob.id);
      } catch (error) {
        console.error('标记工作流消费失败:', error);
      }
      
      // 检查是否还有其他活跃工作流
      console.log('[useScriptGeneration] 检查是否有其他活跃工作流...');
      await checkAndResumeNextWorkflow();
      
      setLoading(false);
    }
  });

  // 打开集数选择对话框
  const handleGenerateClick = (title: string, description: string) => {
    if (!description && !title) {
      alert('请至少填写标题或故事概述');
      return;
    }
    setShowEpisodeModal(true);
  };

  // 生成剧本
  const handleGenerate = async (
    episodeNumber: number,
    title: string,
    description: string,
    style: string,
    length: string,
    nextEpisode: number,
    textModel: string
  ) => {
    if (!description && !title) {
      alert('请至少填写标题或故事概述');
      return;
    }
    
    // 关闭对话框
    setShowEpisodeModal(false);

    let projectToUse = selectedProject;

    // 如果没有选择工程，自动创建一个
    if (!projectToUse) {
      try {
        const projectName = title || `新工程_${new Date().toLocaleDateString('zh-CN')}`;
        const newProject = await createProject({
          name: projectName,
          description: description || '',
          type: 'comic',
          status: 'draft'
        });
        projectToUse = newProject;
        setSelectedProject(newProject);
        localStorage.setItem(LAST_PROJECT_KEY, newProject.id.toString());
      } catch (error: any) {
        alert('自动创建工程失败: ' + error.message);
        return;
      }
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          projectId: projectToUse.id,
          episodeNumber: episodeNumber || nextEpisode,
          title: title || `第${episodeNumber || nextEpisode}集`, 
          description, 
          style, 
          length,
          textModel
        })
      });

      const data = await res.json();
      console.log('[useScriptGeneration] 生成API响应:', data);

      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      console.log('[useScriptGeneration] 设置 generatingJobId:', data.jobId);
      console.log('[useScriptGeneration] 设置 generatingScriptId:', data.scriptId);
      
      // 启动工作流轮询
      setGeneratingJobId(data.jobId);
      setGeneratingScriptId(data.scriptId);
      
      console.log('[useScriptGeneration] 刷新剧本列表...');
      // 刷新剧本列表（显示生成中状态）
      await loadProjectScript(projectToUse.id, data.episodeNumber);
    } catch (error: any) {
      alert(error.message || '生成失败');
      setLoading(false);
    }
  };

  return {
    loading,
    showEpisodeModal,
    setShowEpisodeModal,
    handleGenerateClick,
    handleGenerate
  };
}
