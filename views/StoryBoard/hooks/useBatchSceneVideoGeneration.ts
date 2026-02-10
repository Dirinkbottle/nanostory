/**
 * 批量分镜视频生成 Hook
 * 一键生成一集所有分镜的视频
 * 支持页面刷新后自动恢复状态和进度
 */

import { useCallback } from 'react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflowRecovery } from './useWorkflowRecovery';

interface UseBatchSceneVideoGenerationProps {
  scriptId: number | null;
  projectId: number | null;
  videoModel: string;
  textModel: string;
  duration?: number | null;
  onComplete?: () => void;
}

export function useBatchSceneVideoGeneration({
  scriptId,
  projectId,
  videoModel,
  textModel,
  duration,
  onComplete
}: UseBatchSceneVideoGenerationProps) {
  const recovery = useWorkflowRecovery({
    projectId,
    workflowTypes: ['batch_scene_video_generation'],
    isActive: true,
    onCompleted: () => {
      console.log('[useBatchSceneVideoGen] 批量视频生成完成');
      onComplete?.();
    },
    onFailed: (failedJob) => {
      console.error('[useBatchSceneVideoGen] 批量视频生成失败:', failedJob.error_message);
      alert('批量视频生成失败: ' + (failedJob.error_message || '未知错误'));
    },
    logPrefix: '[useBatchSceneVideoGen]'
  });

  const startBatchVideoGeneration = useCallback(async (overwriteVideos: boolean) => {
    if (!scriptId) {
      alert('请先选择剧本');
      return;
    }
    if (!videoModel) {
      alert('请先选择视频模型');
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/batch-generate-videos/${scriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          videoModel,
          textModel,
          duration,
          overwriteVideos,
          projectId
        })
      });

      const data = await res.json();

      if (res.ok && data.jobId) {
        console.log('[useBatchSceneVideoGen] 任务已启动, jobId:', data.jobId);
        recovery.startJob(data.jobId);
      } else {
        alert(data.message || '启动批量视频生成失败');
      }
    } catch (error) {
      console.error('[useBatchSceneVideoGen] 启动失败:', error);
      alert('启动批量视频生成失败，请检查网络连接');
    }
  }, [scriptId, videoModel, textModel, duration, projectId, recovery.startJob]);

  return {
    startBatchVideoGeneration,
    isGenerating: recovery.isGenerating,
    isCompleted: recovery.isCompleted,
    isFailed: recovery.isFailed,
    progress: recovery.overallProgress,
    job: recovery.job
  };
}
