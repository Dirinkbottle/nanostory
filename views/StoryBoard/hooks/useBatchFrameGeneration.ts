/**
 * 批量分镜帧生成 Hook
 * 一键生成一集所有分镜的首帧/首尾帧图片
 */

import { useState, useCallback } from 'react';
import { useWorkflow } from '../../../hooks/useWorkflow';
import { getAuthToken } from '../../../services/auth';
import { validateBatchFrameReadiness, formatValidationMessage } from '../utils/validateFrameReadiness';

interface UseBatchFrameGenerationProps {
  scriptId: number | null;
  projectId: number | null;
  imageModel: string;
  textModel: string;
  scenes: { characters: string[]; location: string }[];
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
  const [jobId, setJobId] = useState<number | null>(null);

  const { job, isRunning, isCompleted, isFailed, overallProgress } = useWorkflow(jobId, {
    onCompleted: () => {
      console.log('[useBatchFrameGen] 批量生成完成');
      setJobId(null);
      onComplete?.();
    },
    onFailed: (failedJob) => {
      console.error('[useBatchFrameGen] 批量生成失败:', failedJob.error_message);
      setJobId(null);
    }
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
        setJobId(data.jobId);
      } else {
        alert(data.message || '启动批量生成失败');
      }
    } catch (error) {
      console.error('[useBatchFrameGen] 启动失败:', error);
      alert('启动批量生成失败，请检查网络连接');
    }
  }, [scriptId, imageModel, projectId, scenes]);

  return {
    startBatchGeneration,
    isGenerating: isRunning,
    isCompleted,
    isFailed,
    progress: overallProgress,
    job
  };
}
