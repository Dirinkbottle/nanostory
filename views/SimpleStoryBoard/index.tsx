import React, { useState, useEffect } from 'react';
import { useSceneManager } from '../StoryBoard/useSceneManager';
import { useAutoStoryboard } from '../StoryBoard/useAutoStoryboard';
import { useSceneGeneration } from '../StoryBoard/useSceneGeneration';
import { useCharacterData } from '../StoryBoard/ResourcePanel/useCharacterData';
import { useSceneData } from '../StoryBoard/ResourcePanel/useSceneData';
import DarkEpisodeSelector from './DarkEpisodeSelector';
import AutoStoryboardModal from '../StoryBoard/AutoStoryboardModal';
import StoryboardTable from './StoryboardTable';
import ResourceSidebar from './ResourceSidebar';
import { Wand2 } from 'lucide-react';

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

  const { generateVideo, tasks } = useSceneGeneration({
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
      console.warn('缺少必要参数：characterId 或 imageModel');
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/characters/${characterId}/generate-views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          imageModel,
          textModel,
          style: '', // 可以从项目设置中获取
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log('角色图片生成已启动:', data);
        // 刷新角色数据
        loadCharacters();
      } else {
        console.error('生成失败:', data.message);
      }
    } catch (error) {
      console.error('生成角色图片出错:', error);
    }
  };

  // 场景图片生成
  const handleGenerateSceneImage = async (sceneId: number, imageModel: string) => {
    if (!sceneId || !imageModel) {
      console.warn('缺少必要参数：sceneId 或 imageModel');
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/scenes/${sceneId}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
        console.log('场景图片生成已启动:', data);
        // 刷新场景数据
        loadScenes();
      } else {
        console.error('生成失败:', data.message);
      }
    } catch (error) {
      console.error('生成场景图片出错:', error);
    }
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
