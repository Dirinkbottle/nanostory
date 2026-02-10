/**
 * 批量分镜帧生成 Hook
 * 一键生成一集所有分镜的首帧/首尾帧图片
 * 支持页面刷新后自动恢复状态和进度
 */

import { useCallback } from 'react';
import { getAuthToken } from '../../../services/auth';
import { validateBatchFrameReadiness, formatValidationMessage } from '../utils/validateFrameReadiness';
import { useWorkflowRecovery } from './useWorkflowRecovery';

interface UseBatchFrameGenerationProps {
  scriptId: number | null;
  projectId: number | null;
  imageModel: string;
  textModel: string;
  scenes: { id?: number; characters: string[]; location: string }[];
  onComplete?: () => void;
}

export function useBatchFrameGeneration({
  scriptId,
  projectId,
  imageModel,
  textModel,
  scenes,
  onComplete
}: UseBatchFrameGenerationProps) {
  const recovery = useWorkflowRecovery({
    projectId,
    workflowTypes: ['batch_frame_generation'],
    isActive: true,
    onCompleted: () => {
      console.log('[useBatchFrameGen] 批量生成完成');
      onComplete?.();
    },
    onFailed: (failedJob) => {
      console.error('[useBatchFrameGen] 批量生成失败:', failedJob.error_message);
      alert('批量帧生成失败: ' + (failedJob.error_message || '未知错误'));
    },
    logPrefix: '[useBatchFrameGen]'
  });

  const startBatchGeneration = useCallback(async (overwriteFrames: boolean) => {
    if (!scriptId) {
      alert('请先选择剧本');
      return;
    }
    if (!imageModel) {
      alert('请先选择图片模型');
      return;
    }

    // 前置校验：检查所有分镜涉及的角色和场景是否完整
    if (projectId && scenes.length > 0) {
      try {
        const validation = await validateBatchFrameReadiness(projectId, scenes, scriptId);
        if (!validation.ready) {
          alert(formatValidationMessage(validation));
          return;
        }
      } catch (err) {
        console.error('[useBatchFrameGen] 预检失败:', err);
      }
    }

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/batch-generate-frames/${scriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          imageModel,
          textModel,
          overwriteFrames,
          projectId
        })
      });

      const data = await res.json();

      if (res.ok && data.jobId) {
        console.log('[useBatchFrameGen] 任务已启动, jobId:', data.jobId);
        recovery.startJob(data.jobId);
      } else {
        alert(data.message || '启动批量生成失败');
      }
    } catch (error) {
      console.error('[useBatchFrameGen] 启动失败:', error);
      alert('启动批量生成失败，请检查网络连接');
    }
  }, [scriptId, imageModel, projectId, scenes, recovery.startJob]);

  return {
    startBatchGeneration,
    isGenerating: recovery.isGenerating,
    isCompleted: recovery.isCompleted,
    isFailed: recovery.isFailed,
    progress: recovery.overallProgress,
    job: recovery.job
  };
}
