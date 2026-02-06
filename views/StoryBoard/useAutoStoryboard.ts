import { useState } from 'react';
import { useStoryboardGeneration } from './hooks/useStoryboardGeneration';
import { StoryboardScene } from './useSceneManager';

interface UseAutoStoryboardOptions {
  scriptId: number | null;
  projectId: number | null;
  isActive: boolean; // 是否在分镜页面
  hasExistingScenes: boolean;
  onScenesGenerated: (scenes: StoryboardScene[]) => void;
}

export function useAutoStoryboard({
  scriptId,
  projectId,
  isActive,
  hasExistingScenes,
  onScenesGenerated
}: UseAutoStoryboardOptions) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 使用分镜生成 hook
  const { isGenerating, startGeneration } = useStoryboardGeneration({
    scriptId,
    projectId,
    isActive,
    onComplete: () => {
      // 工作流完成后，刷新页面重新加载分镜
      window.location.reload();
    }
  });

  // 点击自动分镜按钮
  const handleAutoGenerateClick = () => {
    if (!scriptId) {
      alert('请先选择或生成一个剧本');
      return;
    }

    const skipConfirm = sessionStorage.getItem('skipStoryboardConfirm') === 'true';

    if (skipConfirm || !hasExistingScenes) {
      startGeneration();
    } else {
      setShowConfirmModal(true);
    }
  };

  // 确认后执行
  const handleConfirmGenerate = () => {
    if (dontShowAgain) {
      sessionStorage.setItem('skipStoryboardConfirm', 'true');
    }
    setShowConfirmModal(false);
    startGeneration();
  };

  return {
    isGenerating,
    showConfirmModal,
    setShowConfirmModal,
    dontShowAgain,
    setDontShowAgain,
    handleAutoGenerateClick,
    handleConfirmGenerate
  };
}
