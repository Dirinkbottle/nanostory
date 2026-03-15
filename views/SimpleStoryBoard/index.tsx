import React, { useState, useEffect } from 'react';
import { useSceneManager } from '../StoryBoard/useSceneManager';
import { useAutoStoryboard } from '../StoryBoard/useAutoStoryboard';
import { useSceneGeneration } from '../StoryBoard/useSceneGeneration';
import { useCharacterData } from '../StoryBoard/ResourcePanel/useCharacterData';
import { useSceneData } from '../StoryBoard/ResourcePanel/useSceneData';
import { useToast } from '../../contexts/ToastContext';
import DarkEpisodeSelector from './DarkEpisodeSelector';
import AutoStoryboardModal from '../StoryBoard/AutoStoryboardModal';
import StoryboardTable from './StoryboardTable';
import ResourceSidebar from './ResourceSidebar';
import { Wand2, Users, Image, Film, Video } from 'lucide-react';
import { Button } from '@heroui/react';
import { getAuthToken } from '../../services/auth';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

interface SimpleStoryBoardProps {
  scriptId?: number | null;
  projectId?: number | null;
  episodeNumber?: number;
  scripts?: Script[];
  textModel: string;
  imageModel: string;
  videoModel: string;
  onEpisodeChange?: (episodeNumber: number, scriptId: number) => void;
}

const SimpleStoryBoard: React.FC<SimpleStoryBoardProps> = ({
  scriptId,
  projectId,
  episodeNumber = 1,
  scripts = [],
  textModel,
  imageModel,
  videoModel,
  onEpisodeChange,
}) => {
  const [currentScriptId, setCurrentScriptId] = useState<number | null>(scriptId || null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(projectId || null);
  const [currentEpisode, setCurrentEpisode] = useState(episodeNumber);
  const { showToast } = useToast();

  // 右侧面板联动状态
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);
  const [selectedSceneName, setSelectedSceneName] = useState<string | null>(null);

  useEffect(() => { if (scriptId !== currentScriptId) setCurrentScriptId(scriptId || null); }, [scriptId]);
  useEffect(() => { if (projectId !== currentProjectId) setCurrentProjectId(projectId || null); }, [projectId]);
  useEffect(() => { if (episodeNumber !== currentEpisode) setCurrentEpisode(episodeNumber); }, [episodeNumber]);

  // 复用现有 hooks
  const {
    scenes, setScenes, isLoading, loadStoryboards,
    addScene, deleteScene, updateDescription, reorderScenes,
  } = useSceneManager(currentScriptId, currentProjectId);

  const autoStoryboard = useAutoStoryboard({
    scriptId: currentScriptId,
    projectId: currentProjectId,
    isActive: true,
    hasExistingScenes: scenes.length > 0,
    textModel,
    onScenesGenerated: (newScenes) => setScenes(newScenes),
  });

  const { generateImage, generateVideo, tasks } = useSceneGeneration({
    projectId: currentProjectId,
    scriptId: currentScriptId,
    episodeNumber: currentEpisode,
    scenes, setScenes,
    imageModel, textModel, videoModel,
  });

  // 数据库角色/场景
  const { dbCharacters, isLoadingCharacters, loadCharacters } = useCharacterData(currentProjectId, currentScriptId);
  const { dbScenes, isLoadingScenes, loadScenes } = useSceneData(currentProjectId, currentScriptId);

  // 收集道具
  const allProps = [...new Set(scenes.flatMap(s => s.props || []))];

  // 集数切换
  const handleEpisodeSelect = (script: Script) => {
    setCurrentScriptId(script.id);
    setCurrentEpisode(script.episode_number);
    onEpisodeChange?.(script.episode_number, script.id);
  };

  // 角色图片生成
  const handleGenerateCharacterImage = async (characterId: number, imageModel: string) => {
    if (!characterId || !imageModel) {
      showToast('缺少必要参数，请选择角色和模型', 'warning');
      return;
    }

    try {
      showToast('正在生成角色三视图...', 'info');
      const token = getAuthToken();
      const response = await fetch(`/api/characters/${characterId}/generate-views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageModel,
          textModel,
          style: '', // 可以从项目设置中获取
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('角色三视图生成任务已启动！', 'success');
        // 刷新角色数据
        loadCharacters();
      } else {
        showToast(data.message || '生成失败', 'error');
      }
    } catch (error) {
      showToast('生成角色图片时出错', 'error');
      console.error('生成角色图片出错:', error);
    }
  };

  // 场景图片生成
  const handleGenerateSceneImage = async (sceneId: number, imageModel: string) => {
    if (!sceneId || !imageModel) {
      showToast('缺少必要参数，请选择场景和模型', 'warning');
      return;
    }

    try {
      showToast('正在生成场景图片...', 'info');
      const token = getAuthToken();
      const response = await fetch(`/api/scenes/${sceneId}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageModel,
          textModel,
          width: 1024,
          height: 576,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('场景图片生成任务已启动！', 'success');
        // 刷新场景数据
        loadScenes();
      } else {
        showToast(data.message || '生成失败', 'error');
      }
    } catch (error) {
      showToast('生成场景图片时出错', 'error');
      console.error('生成场景图片出错:', error);
    }
  };

  // 批量生成角色
  const handleBatchCharacterGeneration = async () => {
    if (!currentProjectId || !currentScriptId) {
      showToast('请先选择项目和剧本', 'warning');
      return;
    }
    if (!imageModel) {
      showToast('请先选择图像模型', 'warning');
      return;
    }
    try {
      showToast('正在启动角色批量生成...', 'info');
      const token = getAuthToken();
      // 不过滤 scriptId，角色是项目级别的
      const charRes = await fetch(`/api/characters/project/${currentProjectId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!charRes.ok) throw new Error('获取角色数据失败');
      const result = await charRes.json();
      const characters = result.characters || [];
      if (characters.length === 0) {
        showToast('没有找到角色数据', 'warning');
        return;
      }
      for (const character of characters) {
        await fetch(`/api/characters/${character.id}/generate-views`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ imageModel, textModel, style: '' })
        });
      }
      showToast(`已启动 ${characters.length} 个角色的批量生成`, 'success');
      loadCharacters();
    } catch (error: any) {
      showToast('角色批量生成失败: ' + error.message, 'error');
    }
  };

  // 批量生成场景
  const handleBatchSceneGeneration = async () => {
    if (!currentProjectId || !currentScriptId) {
      showToast('请先选择项目和剧本', 'warning');
      return;
    }
    if (!imageModel) {
      showToast('请先选择图像模型', 'warning');
      return;
    }
    try {
      showToast('正在启动场景批量生成...', 'info');
      const token = getAuthToken();
      const sceneRes = await fetch(`/api/scenes/project/${currentProjectId}?scriptId=${currentScriptId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!sceneRes.ok) throw new Error('获取场景数据失败');
      const result = await sceneRes.json();
      const sceneList = result.scenes || [];
      if (sceneList.length === 0) {
        showToast('没有找到场景数据', 'warning');
        return;
      }
      for (const scene of sceneList) {
        await fetch(`/api/scenes/${scene.id}/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ imageModel, textModel, width: 1024, height: 576 })
        });
      }
      showToast(`已启动 ${sceneList.length} 个场景的批量生成`, 'success');
      loadScenes();
    } catch (error: any) {
      showToast('场景批量生成失败: ' + error.message, 'error');
    }
  };

  // 批量生成首尾帧
  const handleBatchFrameGeneration = async () => {
    if (!currentScriptId || scenes.length === 0) {
      showToast('请先生成分镜', 'warning');
      return;
    }
    if (!imageModel) {
      showToast('请先选择图像模型', 'warning');
      return;
    }
    showToast(`正在批量生成 ${scenes.length} 个分镜的首尾帧...`, 'info');
    for (const scene of scenes) {
      generateImage(scene.id, 'first');
      generateImage(scene.id, 'last');
    }
    showToast(`已启动 ${scenes.length} 个分镜的首尾帧生成`, 'success');
  };

  // 批量生成视频
  const handleBatchVideoGeneration = async () => {
    if (!currentScriptId || scenes.length === 0) {
      showToast('请先生成分镜', 'warning');
      return;
    }
    if (!videoModel) {
      showToast('请先选择视频模型', 'warning');
      return;
    }
    showToast(`正在批量生成 ${scenes.length} 个分镜的视频...`, 'info');
    for (const scene of scenes) {
      generateVideo(scene.id);
    }
    showToast(`已启动 ${scenes.length} 个分镜的视频生成`, 'success');
  };


  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200">
      {/* 顶部栏 */}
      <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-4">
        <h2 className="text-sm font-bold text-slate-200">分镜设计</h2>
        <DarkEpisodeSelector
          scripts={scripts}
          currentEpisode={currentEpisode}
          onSelect={handleEpisodeSelect}
        />
        {isLoading && <span className="text-xs text-slate-500">加载中...</span>}
        
        {/* 批量生成按钮 */}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all cursor-pointer"
            startContent={<Users className="w-3.5 h-3.5" />}
            onPress={handleBatchCharacterGeneration}
            isDisabled={!currentScriptId}
          >
            批量生成角色
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg shadow-green-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
            startContent={<Image className="w-3.5 h-3.5" />}
            onPress={handleBatchSceneGeneration}
            isDisabled={!currentScriptId}
          >
            批量生成场景
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            startContent={<Film className="w-3.5 h-3.5" />}
            onPress={handleBatchFrameGeneration}
            isDisabled={!currentScriptId}
          >
            批量生成首尾帧
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-lg shadow-rose-500/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
            startContent={<Video className="w-3.5 h-3.5" />}
            onPress={handleBatchVideoGeneration}
            isDisabled={!currentScriptId}
          >
            批量生成视频
          </Button>
        </div>
      </div>

      {/* 无剧本提示 */}
      {!currentScriptId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Wand2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-medium">请先生成剧本</p>
            <p className="text-xs mt-1 text-slate-600">生成剧本后，可以自动将剧本转换为分镜</p>
          </div>
        </div>
      )}

      {/* 主内容 */}
      {currentScriptId && (
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：表格 */}
          <StoryboardTable
            scenes={scenes}
            dbCharacters={dbCharacters}
            dbScenes={dbScenes}
            tasks={tasks}
            onAddScene={addScene}
            onDeleteScene={deleteScene}
            onUpdateDescription={updateDescription}
            onGenerateVideo={generateVideo}
            onGenerateImage={generateImage}
            onCharacterClick={(name) => setSelectedCharName(name)}
            onSceneClick={(name) => setSelectedSceneName(name)}
            onPropClick={() => {}}
            onAddCharacterToScene={() => {}}
            onAddSceneToScene={() => {}}
            onReorderScenes={reorderScenes}
            onAutoGenerate={autoStoryboard.handleAutoGenerateClick}
            isAutoGenerating={autoStoryboard.isGenerating}
          />

          {/* 右侧：资源面板 */}
          <ResourceSidebar
            dbCharacters={dbCharacters}
            dbScenes={dbScenes}
            props={allProps}
            usedCharacterNames={[...new Set(scenes.flatMap(s => s.characters || []))]}
            usedSceneNames={[...new Set(scenes.map(s => s.location).filter(Boolean))]}
            imageModel={imageModel}
            textModel={textModel}
            selectedCharacterName={selectedCharName}
            selectedSceneName={selectedSceneName}
            onClearSelection={() => { setSelectedCharName(null); setSelectedSceneName(null); }}
            onGenerateCharacterImage={handleGenerateCharacterImage}
            onGenerateSceneImage={handleGenerateSceneImage}
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
    </div>
  );
};

export default SimpleStoryBoard;
