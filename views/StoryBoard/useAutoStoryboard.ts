import { useState } from 'react';
import { useStoryboardGeneration, GenerationProgress } from './hooks/useStoryboardGeneration';
import { StoryboardScene } from './useSceneManager';
import { getAuthToken } from '../../services/auth';

interface UseAutoStoryboardOptions {
  scriptId: number | null;
  projectId: number | null;
  isActive: boolean; // 是否在分镜页面
  hasExistingScenes: boolean;
  textModel: string;
  onScenesGenerated: (scenes: StoryboardScene[]) => void;
  onError?: (message: string) => void;
  loadStoryboards?: (scriptId: number) => Promise<void>; // 新增：增量加载回调
  useSceneMode?: boolean; // 新增：是否使用按场景生成模式
}

export function useAutoStoryboard({
  scriptId,
  projectId,
  isActive,
  hasExistingScenes,
  textModel,
  onScenesGenerated,
  onError,
  loadStoryboards,
  useSceneMode = true // 默认使用按场景生成模式
}: UseAutoStoryboardOptions) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // 使用分镜生成 hook
  const { isGenerating, startGeneration, progress, job } = useStoryboardGeneration({
    scriptId,
    projectId,
    isActive,
    onComplete: async () => {
      // 工作流完成后，优先使用增量加载，避免整页刷新
      if (loadStoryboards && scriptId) {
        await loadStoryboards(scriptId);
      } else {
        // 回退：刷新页面
        window.location.reload();
      }
    }
  });

  // 点击自动分镜按钮
  const handleAutoGenerateClick = () => {
    if (!scriptId) {
      onError?.('请先选择或生成一个剧本');
      return;
    }
    if (!textModel) {
      onError?.('请先点击右上角「AI 模型」按钮选择文本模型');
      return;
    }

    if (!hasExistingScenes) {
      startGeneration(textModel, useSceneMode);
      return;
    }

    const skipConfirm = sessionStorage.getItem('skipStoryboardConfirm') === 'true';
    if (skipConfirm) {
      cleanAndGenerate();
    } else {
      setShowConfirmModal(true);
    }
  };

  // 清理旧数据后启动生成
  const cleanAndGenerate = async () => {
    if (!scriptId) return;
    setIsCleaning(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/storyboards/clean-before-regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ scriptId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '清理失败');

      console.log('[AutoStoryboard] 清理完成:', data);
      if (data.deletedStoryboards > 0 || data.deletedCharacters > 0 || data.deletedScenes > 0) {
        console.log(`[AutoStoryboard] 已删除: ${data.deletedStoryboards} 个分镜, ${data.deletedCharacters} 个角色, ${data.deletedScenes} 个场景`);
      }
    } catch (err: any) {
      console.error('[AutoStoryboard] 清理失败:', err);
      onError?.('清理旧数据失败: ' + err.message);
      setIsCleaning(false);
      return;
    }
    setIsCleaning(false);
    startGeneration(textModel, useSceneMode);
  };

  // 确认弹窗后执行
  const handleConfirmGenerate = () => {
    if (dontShowAgain) {
      sessionStorage.setItem('skipStoryboardConfirm', 'true');
    }
    setShowConfirmModal(false);
    cleanAndGenerate();
  };

  return {
    isGenerating: isGenerating || isCleaning,
    showConfirmModal,
    setShowConfirmModal,
    dontShowAgain,
    setDontShowAgain,
    handleAutoGenerateClick,
    handleConfirmGenerate,
    progress, // 新增：实时进度信息
    job // 新增：工作流状态
  };
}
