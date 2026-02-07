import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Wand2, RefreshCw, Upload, Users, MapPin } from 'lucide-react';
import { useSceneManager } from './useSceneManager';
import { useAutoStoryboard } from './useAutoStoryboard';
import { useSceneGeneration } from './useSceneGeneration';
import { useCharacterExtraction } from './hooks/useCharacterExtraction';
import { useSceneExtraction } from './hooks/useSceneExtraction';
import { useFrameGeneration } from './hooks/useFrameGeneration';
import { useBatchFrameGeneration } from './hooks/useBatchFrameGeneration';
import { useBatchSceneVideoGeneration } from './hooks/useBatchSceneVideoGeneration';
import EpisodeSelector from './EpisodeSelector';
import AutoStoryboardModal from './AutoStoryboardModal';
import ImportStoryboardModal from './ImportStoryboardModal';
import SceneList from './SceneList';
import ResourcePanel from './ResourcePanel';
import { getAuthToken } from '../../services/auth';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

interface StoryBoardProps {
  scriptId?: number | null;
  projectId?: number | null;
  episodeNumber?: number;
  scripts?: Script[];
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
  textModel,
  imageModel,
  videoModel,
  onEpisodeChange
}) => {
  const [currentScriptId, setCurrentScriptId] = useState<number | null>(scriptId || null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(projectId || null);
  const [currentEpisode, setCurrentEpisode] = useState(episodeNumber);
  const [showImportModal, setShowImportModal] = useState(false);

  // 同步外部 props
  useEffect(() => { if (scriptId !== currentScriptId) setCurrentScriptId(scriptId || null); }, [scriptId]);
  useEffect(() => { if (projectId !== currentProjectId) setCurrentProjectId(projectId || null); }, [projectId]);
  useEffect(() => { if (episodeNumber !== currentEpisode) setCurrentEpisode(episodeNumber); }, [episodeNumber]);

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
    }
  });

  // 5. 场景图片/视频生成
  const { generateImage, generateVideo, tasks } = useSceneGeneration({
    projectId: currentProjectId,
    scriptId: currentScriptId,
    scenes,
    setScenes,
    imageModel,
    textModel,
    videoModel
  });

  // 6. 角色提取
  const characterExtraction = useCharacterExtraction({
    projectId: currentProjectId,
    scriptId: currentScriptId,
    scenes,
    isActive: true,
    onCompleted: () => {
      console.log('[StoryBoard] 角色提取完成');
    }
  });

  // 7. 场景提取
  const sceneExtraction = useSceneExtraction({
    projectId: currentProjectId,
    scriptId: currentScriptId,
    scenes,
    isActive: true,
    onCompleted: () => {
      console.log('[StoryBoard] 场景提取完成');
    }
  });

  // 8. 批量帧生成
  const batchFrameGen = useBatchFrameGeneration({
    scriptId: currentScriptId,
    projectId: currentProjectId,
    imageModel,
    textModel,
    onComplete: () => {
      console.log('[StoryBoard] 批量帧生成完成，重新加载分镜');
      if (currentScriptId) {
        loadStoryboards(currentScriptId);
      }
    }
  });

  // 9. 批量视频生成
  const batchSceneVideoGen = useBatchSceneVideoGeneration({
    scriptId: currentScriptId,
    projectId: currentProjectId,
    videoModel,
    textModel,
    // duration 不传，让每个分镜根据自身 hasAction 决定时长（有动作3秒，无动作2秒）
    onComplete: () => {
      console.log('[StoryBoard] 批量视频生成完成，重新加载分镜');
      if (currentScriptId) {
        loadStoryboards(currentScriptId);
      }
    }
  });

  // 10. 首尾帧生成轮询
  const frameGeneration = useFrameGeneration({
    sceneId: null,
    projectId: currentProjectId,
    isActive: true,
    onComplete: () => {
      console.log('[StoryBoard] 首尾帧生成完成，重新加载分镜');
      // 重新加载分镜以获取最新的首尾帧 URL
      if (currentScriptId) {
        loadStoryboards(currentScriptId);
      }
    }
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
      alert('请先选择一个剧本');
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
          endFrame: scene.endFrame
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

      alert(`成功导入 ${formattedScenes.length} 个分镜！`);
      
      // 重新加载分镜列表
      await loadStoryboards(currentScriptId);
      
    } catch (error: any) {
      console.error('[ImportScenes] 保存失败:', error);
      alert('导入失败: ' + error.message);
    }
  };


  // 收集资源面板数据
  const allCharacters = [...new Set(scenes.flatMap(s => s.characters))];
  const allLocations = [...new Set(scenes.map(s => s.location).filter(Boolean))];
  const allProps = [...new Set(scenes.flatMap(s => s.props))];
  
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
    <div className="h-full flex flex-col bg-slate-50">
      {/* 顶部工具栏 */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">分镜设计</h2>
          <EpisodeSelector
            scripts={scripts}
            currentEpisode={currentEpisode}
            onSelect={handleEpisodeSelect}
          />
          {scenes.length > 0 && (
            <span className="text-sm text-slate-500">共 {scenes.length} 个分镜</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="bg-slate-100 text-slate-600 font-medium"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={() => currentScriptId && loadStoryboards(currentScriptId)}
            isLoading={isLoading}
            isDisabled={!currentScriptId}
          >
            刷新
          </Button>
          <Button
            size="sm"
            variant="flat"
            startContent={<Upload className="w-4 h-4" />}
            onPress={() => setShowImportModal(true)}
            isDisabled={!currentScriptId}
          >
            从 JSON 导入
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="bg-purple-50 text-purple-600 font-medium"
            startContent={<Users className="w-4 h-4" />}
            onPress={() => characterExtraction.startExtraction(textModel)}
            isLoading={characterExtraction.isExtracting}
            isDisabled={!currentProjectId || scenes.length === 0 || characterExtraction.isExtracting}
          >
            {characterExtraction.isExtracting ? '提取中...' : '提取角色'}
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="bg-green-50 text-green-600 font-medium"
            startContent={<MapPin className="w-4 h-4" />}
            onPress={() => sceneExtraction.startExtraction(textModel)}
            isLoading={sceneExtraction.isExtracting}
            isDisabled={!currentProjectId || scenes.length === 0 || sceneExtraction.isExtracting}
          >
            {sceneExtraction.isExtracting ? '提取中...' : '提取场景'}
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold"
            startContent={<Wand2 className="w-4 h-4" />}
            onPress={autoStoryboard.handleAutoGenerateClick}
            isLoading={autoStoryboard.isGenerating}
            isDisabled={!currentScriptId || autoStoryboard.isGenerating}
          >
            {autoStoryboard.isGenerating ? '生成中...' : '智能生成分镜'}
          </Button>
        </div>
      </div>

      {/* 无剧本提示 */}
      {!currentScriptId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Wand2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">请先生成剧本</p>
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
              onSelectScene={setSelectedScene}
              onAddScene={addScene}
              onDeleteScene={deleteScene}
              onMoveScene={moveScene}
              onUpdateDescription={updateDescription}
              onReorderScenes={reorderScenes}
              onGenerateImage={generateImage}
              onGenerateVideo={generateVideo}
              tasks={tasks}
              onBatchGenerate={(overwrite) => batchFrameGen.startBatchGeneration(overwrite)}
              isBatchGenerating={batchFrameGen.isGenerating}
              batchProgress={batchFrameGen.progress}
              onBatchGenerateVideo={(overwrite) => batchSceneVideoGen.startBatchVideoGeneration(overwrite)}
              isBatchGeneratingVideo={batchSceneVideoGen.isGenerating}
              batchVideoProgress={batchSceneVideoGen.progress}
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
    </div>
  );
};

export default StoryBoard;
