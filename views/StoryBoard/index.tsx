import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { Button, Select, SelectItem } from '@heroui/react';
import { Wand2, RefreshCw, Upload, Download, Video, ImageIcon } from 'lucide-react';
import { useSceneManager } from './useSceneManager';
import { useAutoStoryboard } from './useAutoStoryboard';
import { useSceneGeneration } from './useSceneGeneration';
import { useBatchFrameGeneration } from './hooks/useBatchFrameGeneration';
import { useBatchSceneVideoGeneration } from './hooks/useBatchSceneVideoGeneration';
import { useWorkflowRecovery } from './hooks/useWorkflowRecovery';
import EpisodeSelector from './EpisodeSelector';
import AutoStoryboardModal from './AutoStoryboardModal';
import ImportStoryboardModal from './ImportStoryboardModal';
import BatchDownloadModal from './BatchDownloadModal';
import SceneList from './SceneList';
import ResourcePanel from './ResourcePanel';
import { getAuthToken } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { AIModel } from '../../components/AIModelSelector';
import { normalizeCapabilityOptions } from '../../utils/modelCapabilities';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

// Error Boundary to catch rendering errors and prevent full-view crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class StoryboardErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[StoryboardErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 bg-[#0c0e1a]">
          <p className="text-lg font-medium text-[#a8a29e]">Something went wrong loading the storyboard.</p>
          <p className="text-sm text-gray-400">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface StoryBoardProps {
  scriptId?: number | null;
  projectId?: number | null;
  episodeNumber?: number;
  scripts?: Script[];
  models?: AIModel[];
  textModel: string;
  imageModel: string;
  videoModel: string;
  onEpisodeChange?: (episodeNumber: number, scriptId: number) => void;
}

const StoryBoard: React.FC<StoryBoardProps> = ({
  scriptId,
  projectId,
  episodeNumber = 1,
  scripts = [],
  models = [],
  textModel,
  imageModel,
  videoModel,
  onEpisodeChange
}) => {
  const [currentScriptId, setCurrentScriptId] = useState<number | null>(scriptId || null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(projectId || null);
  const [currentEpisode, setCurrentEpisode] = useState(episodeNumber);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBatchDownloadModal, setShowBatchDownloadModal] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isSubmittingCharacterBatch, setIsSubmittingCharacterBatch] = useState(false);
  const [isSubmittingSceneBatch, setIsSubmittingSceneBatch] = useState(false);
  const { showToast } = useToast();

  // O(1) model lookup via Map
  const modelMap = useMemo(() => {
    const map = new Map<string, typeof models[number]>();
    for (const m of models) {
      map.set(m.name, m);
    }
    return map;
  }, [models]);

  const imageModelConfig = useMemo(() => {
    const model = modelMap.get(imageModel);
    return model && (model.type || model.category)?.toUpperCase() === 'IMAGE' ? model : undefined;
  }, [modelMap, imageModel]);

  const videoModelConfig = useMemo(() => {
    const model = modelMap.get(videoModel);
    return model && (model.type || model.category)?.toUpperCase() === 'VIDEO' ? model : undefined;
  }, [modelMap, videoModel]);

  const imageAspectRatioOptions = useMemo(
    () => normalizeCapabilityOptions(imageModelConfig?.supportedAspectRatios, 'aspectRatio'),
    [imageModelConfig]
  );
  const videoAspectRatioOptions = useMemo(
    () => normalizeCapabilityOptions(videoModelConfig?.supportedAspectRatios, 'aspectRatio'),
    [videoModelConfig]
  );
  const videoDurationOptions = useMemo(
    () => normalizeCapabilityOptions(videoModelConfig?.supportedDurations, 'duration'),
    [videoModelConfig]
  );

  // 同步外部 props - 合并为单个 useEffect 减少渲染开销
  useEffect(() => {
    if (scriptId !== undefined && scriptId !== currentScriptId) {
      setCurrentScriptId(scriptId || null);
    }
    if (projectId !== undefined && projectId !== currentProjectId) {
      setCurrentProjectId(projectId || null);
    }
    if (episodeNumber !== undefined && episodeNumber !== currentEpisode) {
      setCurrentEpisode(episodeNumber);
    }
  }, [scriptId, projectId, episodeNumber, currentScriptId, currentProjectId, currentEpisode]);

  useEffect(() => {
    if (imageAspectRatioOptions.length === 0) {
      setImageAspectRatio('');
      return;
    }

    setImageAspectRatio((current) =>
      imageAspectRatioOptions.some((option) => option.value === current)
        ? current
        : imageAspectRatioOptions[0].value
    );
  }, [imageAspectRatioOptions]);

  useEffect(() => {
    if (videoAspectRatioOptions.length === 0) {
      setVideoAspectRatio('');
    } else {
      setVideoAspectRatio((current) =>
        videoAspectRatioOptions.some((option) => option.value === current)
          ? current
          : videoAspectRatioOptions[0].value
      );
    }

    if (videoDurationOptions.length === 0) {
      setVideoDuration(null);
      return;
    }

    setVideoDuration((current) => {
      const currentValue = current === null ? '' : String(current);
      const matchedOption = videoDurationOptions.find((option) => option.value === currentValue);
      return matchedOption ? Number(matchedOption.value) : Number(videoDurationOptions[0].value);
    });
  }, [videoAspectRatioOptions, videoDurationOptions]);

  // 1. 分镜列表管理
  const {
    scenes,
    setScenes,
    selectedScene,
    setSelectedScene,
    isLoading,
    loadStoryboards,
    addScene,
    deleteScene,
    updateDescription,
    moveScene,
    reorderScenes
  } = useSceneManager(currentScriptId, currentProjectId);

  // 2. 自动分镜
  const autoStoryboard = useAutoStoryboard({
    scriptId: currentScriptId,
    projectId: currentProjectId,
    isActive: true,
    hasExistingScenes: scenes.length > 0,
    textModel,
    onScenesGenerated: (newScenes) => {
      setScenes(newScenes);
      if (newScenes.length > 0) setSelectedScene(newScenes[0].id);
    },
    onError: (msg) => showToast(msg, 'error'),
    loadStoryboards // 传入增量加载函数，避免整页刷新
  });

  // 5. 场景图片/视频生成
  const { generateImage, generateVideo, tasks } = useSceneGeneration({
    projectId: currentProjectId,
    scriptId: currentScriptId,
    episodeNumber: currentEpisode,
    scenes,
    setScenes,
    imageModel,
    imageAspectRatio,
    textModel,
    videoModel,
    videoAspectRatio,
    videoDuration
  });

  const characterBatchRecovery = useWorkflowRecovery({
    projectId: currentProjectId,
    workflowTypes: ['character_views_generation'],
    isActive: true,
    logPrefix: '[StoryBoardCharacterBatch]'
  });

  const sceneBatchRecovery = useWorkflowRecovery({
    projectId: currentProjectId,
    workflowTypes: ['scene_image_generation'],
    isActive: true,
    logPrefix: '[StoryBoardSceneBatch]'
  });

  // 批量生成功能
  const handleBatchCharacterGeneration = async () => {
    if (isSubmittingCharacterBatch || characterBatchRecovery.isGenerating) {
      showToast('角色批量生成任务正在进行中', 'warning');
      return;
    }
    if (!currentProjectId || !currentScriptId) {
      showToast('请先选择项目和剧本', 'warning');
      return;
    }
    if (!imageModel) {
      showToast('请先选择图像模型', 'warning');
      return;
    }
    if (!imageAspectRatio) {
      showToast('当前图片模型未配置可用长宽比', 'warning');
      return;
    }

    try {
      setIsSubmittingCharacterBatch(true);
      showToast('正在启动角色批量生成...', 'info');
      
      // 获取所有角色数据（不过滤 scriptId，角色是项目级别的）
      const token = getAuthToken();
      const charRes = await fetch(`/api/characters/project/${currentProjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!charRes.ok) {
        throw new Error('获取角色数据失败');
      }
      
      const result = await charRes.json();
      const characters = result.characters || [];
      
      if (characters.length === 0) {
        showToast('没有找到角色数据', 'warning');
        return;
      }
      
      // 为每个角色启动生成任务
      let startedCount = 0;
      let recoveredCount = 0;
      let failedCount = 0;
      for (const character of characters) {
        try {
          const response = await fetch(`/api/characters/${character.id}/generate-views`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              imageModel,
              textModel,
              style: '',
              aspectRatio: imageAspectRatio
            })
          });

          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            startedCount += 1;
          } else if (response.status === 409 && data.jobId) {
            recoveredCount += 1;
          } else {
            failedCount += 1;
            console.error(`生成角色 ${character.name} 图片失败:`, data.message || response.statusText);
          }
        } catch (err) {
          failedCount += 1;
          console.error(`生成角色 ${character.name} 图片失败:`, err);
        }
      }

      await characterBatchRecovery.checkAndResume();
      
      // Show summary with failure count if any
      const total = characters.length;
      if (failedCount > 0) {
        showToast(
          `角色批量生成：成功 ${startedCount + recoveredCount}/${total}，失败 ${failedCount} 个`,
          failedCount === total ? 'error' : 'warning'
        );
      } else {
        showToast(`角色批量生成已提交：新启动 ${startedCount} 个，恢复 ${recoveredCount} 个`, 'success');
      }
    } catch (error: any) {
      showToast('角色批量生成失败: ' + error.message, 'error');
      console.error('角色批量生成失败:', error);
    } finally {
      setIsSubmittingCharacterBatch(false);
    }
  };

  const handleBatchSceneGeneration = async () => {
    if (isSubmittingSceneBatch || sceneBatchRecovery.isGenerating) {
      showToast('场景批量生成任务正在进行中', 'warning');
      return;
    }
    if (!currentProjectId || !currentScriptId) {
      showToast('请先选择项目和剧本', 'warning');
      return;
    }
    if (!imageAspectRatio) {
      showToast('当前图片模型未配置可用长宽比', 'warning');
      return;
    }

    try {
      setIsSubmittingSceneBatch(true);
      showToast('正在启动场景批量生成...', 'info');
      
      // 获取所有场景数据
      const token = getAuthToken();
      const sceneRes = await fetch(`/api/scenes/project/${currentProjectId}?scriptId=${currentScriptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!sceneRes.ok) {
        throw new Error('获取场景数据失败');
      }
      
      const result = await sceneRes.json();
      const scenesData = result.scenes || [];
      
      if (scenesData.length === 0) {
        showToast('没有找到场景数据', 'warning');
        return;
      }
      
      // 为每个场景启动生成任务
      let startedCount = 0;
      let recoveredCount = 0;
      let failedCount = 0;
      for (const scene of scenesData) {
        try {
          const response = await fetch(`/api/scenes/${scene.id}/generate-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              imageModel,
              textModel,
              aspectRatio: imageAspectRatio
            })
          });

          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            startedCount += 1;
          } else if (response.status === 409 && data.jobId) {
            recoveredCount += 1;
          } else {
            failedCount += 1;
            console.error(`生成场景 ${scene.name} 图片失败:`, data.message || response.statusText);
          }
        } catch (err) {
          failedCount += 1;
          console.error(`生成场景 ${scene.name} 图片失败:`, err);
        }
      }

      await sceneBatchRecovery.checkAndResume();
      
      // Show summary with failure count if any
      const total = scenesData.length;
      if (failedCount > 0) {
        showToast(
          `场景批量生成：成功 ${startedCount + recoveredCount}/${total}，失败 ${failedCount} 个`,
          failedCount === total ? 'error' : 'warning'
        );
      } else {
        showToast(`场景批量生成已提交：新启动 ${startedCount} 个，恢复 ${recoveredCount} 个`, 'success');
      }
    } catch (error: any) {
      showToast('场景批量生成失败: ' + error.message, 'error');
      console.error('场景批量生成失败:', error);
    } finally {
      setIsSubmittingSceneBatch(false);
    }
  };

  const handleBatchFrameGeneration = async () => {
    if (!currentScriptId) {
      showToast('请先选择剧本', 'warning');
      return;
    }

    try {
      showToast('正在启动首尾帧批量生成...', 'info');
      await batchFrameGen.startBatchGeneration(false);
      showToast('首尾帧批量生成任务已提交', 'success');
    } catch (error: any) {
      showToast('首尾帧批量生成失败: ' + error.message, 'error');
      console.error('首尾帧批量生成失败:', error);
    }
  };

  const handleBatchVideoGeneration = async () => {
    if (!currentScriptId || scenes.length === 0) {
      showToast('请先生成分镜', 'warning');
      return;
    }
    try {
      showToast(`正在批量生成 ${scenes.length} 个分镜的视频...`, 'info');
      await batchSceneVideoGen.startBatchVideoGeneration(false);
      showToast('批量视频生成任务已提交', 'success');
    } catch (error: any) {
      showToast('视频批量生成失败: ' + error.message, 'error');
      console.error('视频批量生成失败:', error);
    }
  };


  // 8. 批量帧生成
  const batchFrameGen = useBatchFrameGeneration({
    scriptId: currentScriptId,
    projectId: currentProjectId,
    imageModel,
    aspectRatio: imageAspectRatio,
    textModel,
    scenes,
    onComplete: () => {
      console.log('[StoryBoard] 批量帧生成完成，重新加载分镜');
      if (currentScriptId) {
        loadStoryboards(currentScriptId);
      }
    },
    onError: (msg) => showToast(msg, 'error')
  });

  // 9. 批量视频生成
  const batchSceneVideoGen = useBatchSceneVideoGeneration({
    scriptId: currentScriptId,
    projectId: currentProjectId,
    videoModel,
    textModel,
    aspectRatio: videoAspectRatio,
    duration: videoDuration,
    onComplete: () => {
      console.log('[StoryBoard] 批量视频生成完成，重新加载分镜');
      if (currentScriptId) {
        loadStoryboards(currentScriptId);
      }
    },
    onError: (msg) => showToast(msg, 'error')
  });


  // 4. 集数切换
  const handleEpisodeSelect = (script: Script) => {
    setCurrentScriptId(script.id);
    setCurrentEpisode(script.episode_number);
    onEpisodeChange?.(script.episode_number, script.id);
  };

  // 5. 导入分镜
  const handleImportScenes = async (importedScenes: any[]) => {
    if (!currentScriptId) {
      showToast('请先选择一个剧本', 'warning');
      return;
    }

    try {
      // 转换导入的数据为标准格式
      const formattedScenes = importedScenes.map((scene, index) => ({
        idx: scene.order || index + 1,
        prompt_template: scene.description || scene.prompt_template || '',
        variables_json: {
          shotType: scene.shotType || '中景',
          dialogue: scene.dialogue || '',
          duration: scene.duration || 3,
          characters: scene.characters || [],
          location: scene.location || '',
          emotion: scene.emotion || '',
          hasAction: scene.hasAction || false,
          startFrame: scene.startFrame,
          endFrame: scene.endFrame,
          cameraMovement: scene.cameraMovement,
          endState: scene.endState
        }
      }));

      // 保存到数据库
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/${currentScriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ items: formattedScenes })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '保存失败');
      }

      showToast(`成功导入 ${formattedScenes.length} 个分镜！`, 'success');
      
      // 重新加载分镜列表
      await loadStoryboards(currentScriptId);
      
    } catch (error: any) {
      console.error('[ImportScenes] 保存失败:', error);
      showToast('导入失败: ' + error.message, 'error');
    }
  };


  // 收集资源面板数据 - 使用 useMemo 避免每次渲染重新计算
  const allCharacters = useMemo(() => 
    [...new Set(scenes.flatMap(s => s.characters))], [scenes]);
  const allLocations = useMemo(() => 
    [...new Set(scenes.map(s => s.location).filter(Boolean))], [scenes]);
  const allProps = useMemo(() => 
    [...new Set(scenes.flatMap(s => s.props))], [scenes]);
  
  // Debug: 检查角色数据
  useEffect(() => {
    console.log('[StoryBoard] 分镜数量:', scenes.length);
    console.log('[StoryBoard] 前3个分镜的角色数据:', scenes.slice(0, 3).map(s => ({
      id: s.id,
      characters: s.characters,
      description: s.description?.substring(0, 50)
    })));
    console.log('[StoryBoard] 收集到的角色:', allCharacters);
  }, [scenes, allCharacters]);

  return (
    <div className="h-full flex flex-col bg-[#0c0e1a]">
      {/* 顶部工具栏 */}
      <div className="px-4 py-3 genshin-navbar backdrop-blur-xl border-b flex items-center justify-between">
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold genshin-title">分镜设计</h2>
              <EpisodeSelector
                scripts={scripts}
                currentEpisode={currentEpisode}
                onSelect={handleEpisodeSelect}
              />
              {scenes.length > 0 && (
                <span className="text-sm text-[#a8a29e]">共 {scenes.length} 个分镜</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                className="bg-[rgba(230,200,122,0.1)] text-[#a8a29e] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(230,200,122,0.3)] hover:text-[#e6c87a] font-medium transition-all"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={() => currentScriptId && loadStoryboards(currentScriptId)}
                isLoading={isLoading}
                isDisabled={!currentScriptId}
              >
                刷新
              </Button>
              {scenes.length > 0 && (
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-gradient-to-r from-emerald-500/15 to-green-500/15 border border-emerald-500/30 text-emerald-400 font-medium hover:from-emerald-500/25 hover:to-green-500/25 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={() => setShowBatchDownloadModal(true)}
                >
                  批量下载
                </Button>
              )}
              <Button
                size="sm"
                variant="flat"
                className="bg-[rgba(230,200,122,0.1)] text-[#a8a29e] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(230,200,122,0.3)] hover:text-[#e6c87a] font-medium transition-all"
                startContent={<Upload className="w-4 h-4" />}
                onPress={() => setShowImportModal(true)}
                isDisabled={!currentScriptId}
              >
                从 JSON 导入
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={handleBatchCharacterGeneration}
                isDisabled={!currentScriptId || isSubmittingCharacterBatch || characterBatchRecovery.isGenerating}
                isLoading={isSubmittingCharacterBatch || characterBatchRecovery.isGenerating}
              >
                批量生成角色
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg shadow-green-500/30 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={handleBatchSceneGeneration}
                isDisabled={!currentScriptId || isSubmittingSceneBatch || sceneBatchRecovery.isGenerating}
                isLoading={isSubmittingSceneBatch || sceneBatchRecovery.isGenerating}
              >
                批量生成场景
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={handleBatchFrameGeneration}
                isDisabled={!currentScriptId || batchFrameGen.isGenerating}
                isLoading={batchFrameGen.isGenerating}
              >
                批量生成首尾帧
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-lg shadow-rose-500/30 hover:shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all"
                startContent={<Video className="w-4 h-4" />}
                onPress={handleBatchVideoGeneration}
                isDisabled={!currentScriptId || batchSceneVideoGen.isGenerating}
                isLoading={batchSceneVideoGen.isGenerating}
              >
                批量生成视频
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-[#1a1d35] font-bold shadow-lg shadow-amber-500/30 hover:shadow-[0_0_25px_rgba(230,200,122,0.4)] transition-all"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={autoStoryboard.handleAutoGenerateClick}
                isLoading={autoStoryboard.isGenerating}
                isDisabled={!currentScriptId || autoStoryboard.isGenerating}
              >
                {autoStoryboard.isGenerating
                  ? (autoStoryboard.progress
                      ? `${autoStoryboard.progress.currentStep}/${autoStoryboard.progress.totalSteps} ${autoStoryboard.progress.stepName}`
                      : '生成中...')
                  : '智能生成分镜'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {imageModel && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3 py-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <div className="text-xs text-slate-400">图片模型</div>
                <div className="text-sm font-semibold text-slate-100 min-w-[120px]">{imageModel}</div>
                <Select
                  size="sm"
                  label="图片比例"
                  placeholder={imageAspectRatioOptions.length > 0 ? '选择图片比例' : '未配置支持比例'}
                  selectedKeys={imageAspectRatio ? [imageAspectRatio] : []}
                  onChange={(e) => setImageAspectRatio(e.target.value)}
                  className="w-44"
                  isDisabled={imageAspectRatioOptions.length === 0}
                  classNames={{
                    trigger: "bg-slate-800/60 border-slate-600/50 hover:border-cyan-500/50",
                    label: "text-slate-400 text-xs",
                    value: "text-slate-200 text-sm"
                  }}
                >
                  {imageAspectRatioOptions.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
              </div>
            )}

            {videoModel && (
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-400" />
                  <div className="text-xs text-slate-400">视频模型</div>
                  <div className="text-sm font-semibold text-slate-100 min-w-[120px]">{videoModel}</div>
                </div>
                <Select
                  size="sm"
                  label="视频比例"
                  placeholder={videoAspectRatioOptions.length > 0 ? '选择视频比例' : '未配置支持比例'}
                  selectedKeys={videoAspectRatio ? [videoAspectRatio] : []}
                  onChange={(e) => setVideoAspectRatio(e.target.value)}
                  className="w-44"
                  isDisabled={videoAspectRatioOptions.length === 0}
                  classNames={{
                    trigger: "bg-slate-800/60 border-slate-600/50 hover:border-rose-500/50",
                    label: "text-slate-400 text-xs",
                    value: "text-slate-200 text-sm"
                  }}
                >
                  {videoAspectRatioOptions.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
                <Select
                  size="sm"
                  label="视频时长"
                  placeholder={videoDurationOptions.length > 0 ? '选择视频时长' : '未配置支持时长'}
                  selectedKeys={videoDuration === null ? [] : [String(videoDuration)]}
                  onChange={(e) => setVideoDuration(Number(e.target.value))}
                  className="w-36"
                  isDisabled={videoDurationOptions.length === 0}
                  classNames={{
                    trigger: "bg-slate-800/60 border-slate-600/50 hover:border-rose-500/50",
                    label: "text-slate-400 text-xs",
                    value: "text-slate-200 text-sm"
                  }}
                >
                  {videoDurationOptions.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 无剧本提示 */}
      {!currentScriptId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[#6b6561]">
            <Wand2 className="w-16 h-16 mx-auto mb-4 text-[#4a4540]" />
            <p className="text-lg font-medium text-[#a8a29e]">请先生成剧本</p>
            <p className="text-sm mt-1">生成剧本后，可以自动将剧本转换为分镜</p>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      {currentScriptId && (
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：分镜列表 */}
          <div className="flex-1 overflow-y-auto">
            <SceneList
              scenes={scenes}
              selectedScene={selectedScene}
              projectId={currentProjectId}
              scriptId={currentScriptId}
              onSelectScene={setSelectedScene}
              onAddScene={addScene}
              onDeleteScene={deleteScene}
              onMoveScene={moveScene}
              onUpdateDescription={updateDescription}
              onReorderScenes={reorderScenes}
              onGenerateImage={generateImage}
              onGenerateVideo={generateVideo}
              onUpdateScene={(id, updates) => {
                setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
              }}
              tasks={tasks}
              onBatchGenerate={(overwrite) => batchFrameGen.startBatchGeneration(overwrite)}
              isBatchGenerating={batchFrameGen.isGenerating}
              batchProgress={batchFrameGen.progress}
              onBatchGenerateVideo={(overwrite) => batchSceneVideoGen.startBatchVideoGeneration(overwrite)}
              isBatchGeneratingVideo={batchSceneVideoGen.isGenerating}
              batchVideoProgress={batchSceneVideoGen.progress}
              isLoading={isLoading}
            />
          </div>

          {/* 右侧：资源面板 */}
          <ResourcePanel
            characters={allCharacters}
            locations={allLocations}
            props={allProps}
            projectId={currentProjectId}
            scriptId={currentScriptId}
            scenes={scenes}
            imageModel={imageModel}
            imageAspectRatio={imageAspectRatio}
            textModel={textModel}
          />
        </div>
      )}

      {/* 自动分镜确认弹窗 */}
      <AutoStoryboardModal
        isOpen={autoStoryboard.showConfirmModal}
        onOpenChange={autoStoryboard.setShowConfirmModal}
        dontShowAgain={autoStoryboard.dontShowAgain}
        onDontShowAgainChange={autoStoryboard.setDontShowAgain}
        onConfirm={autoStoryboard.handleConfirmGenerate}
      />

      {/* 导入分镜弹窗 */}
      <ImportStoryboardModal
        isOpen={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportScenes}
      />

      {/* 批量下载弹窗 */}
      <BatchDownloadModal
        isOpen={showBatchDownloadModal}
        onOpenChange={setShowBatchDownloadModal}
        scenes={scenes}
      />
    </div>
  );
};

// Wrap with error boundary
const StoryBoardWithErrorBoundary: React.FC<StoryBoardProps> = (props) => (
  <StoryboardErrorBoundary>
    <StoryBoard {...props} />
  </StoryboardErrorBoundary>
);

export default StoryBoardWithErrorBoundary;
