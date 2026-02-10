import { useState } from 'react';
import { useStoryboardGeneration } from './hooks/useStoryboardGeneration';
import { StoryboardScene } from './useSceneManager';
import { getAuthToken } from '../../services/auth';

interface UseAutoStoryboardOptions {
  scriptId: number | null;
  projectId: number | null;
  isActive: boolean; // 是否在分镜页面
  hasExistingScenes: boolean;
  textModel: string;
  onScenesGenerated: (scenes: StoryboardScene[]) => void;
}

export function useAutoStoryboard({
  scriptId,
  projectId,
  isActive,
  hasExistingScenes,
  textModel,
  onScenesGenerated
}: UseAutoStoryboardOptions) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

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
    if (!textModel) {
      alert('请先点击右上角「AI 模型」按钮选择文本模型');
      return;
    }

    if (!hasExistingScenes) {
      startGeneration(textModel);
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
      alert('清理旧数据失败: ' + err.message);
      setIsCleaning(false);
      return;
    }
    setIsCleaning(false);
    startGeneration(textModel);
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
    handleConfirmGenerate
  };
}
