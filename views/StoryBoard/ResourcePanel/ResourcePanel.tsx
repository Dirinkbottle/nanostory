import React, { useState } from 'react';
import { Button } from '@heroui/react';
import { Save } from 'lucide-react';
import { ResourcePanelProps, TabType } from './types';
import { useCharacterData } from './useCharacterData';
import { useSceneData, Scene } from './useSceneData';
import TabButtons from './TabButtons';
import CharactersTab from './CharactersTab';
import LocationsTab from './LocationsTab';
import PropsTab from './PropsTab';
import CharacterViewsModal from './CharacterViewsModal';
import CharacterDetailModal from './CharacterDetailModal';
import SceneDetailModal from './SceneDetailModal';
import SceneImageModal from './SceneImageModal';
import { useResourceModals } from './useResourceModals';
import { Character } from './types';
import { useSceneImageGeneration } from '../hooks/useSceneImageGeneration';
import { getAuthToken } from '../../../services/auth';

const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  characters, 
  locations, 
  props,
  projectId,
  scriptId,
  scenes,
  imageModel,
  textModel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('characters');
  
  const { dbCharacters, isLoadingCharacters, loadCharacters } = useCharacterData(projectId, scriptId);
  const { dbScenes, isLoadingScenes, loadScenes } = useSceneData(projectId, scriptId);
  
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewsCharacterId, setViewsCharacterId] = useState<number | undefined>(undefined);
  
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [isSceneDetailModalOpen, setIsSceneDetailModalOpen] = useState(false);
  const [isSceneImageModalOpen, setIsSceneImageModalOpen] = useState(false);

  const {
    selectedResource,
    isGenerating,
    generatedPrompts,
    isViewsModalOpen,
    handleGenerateViews,
    closeViewsModal
  } = useResourceModals();

  const handleShowDetail = (character: Character) => {
    setSelectedCharacter(character);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCharacter(null);
  };

  const handleGenerateViewsWrapper = (charName: string, characterId: number) => {
    setViewsCharacterId(characterId);
    // 传空字符串表示仅打开弹窗查看，不立即生成
    handleGenerateViews(charName, '', '', characterId);
  };

  const sceneImageGeneration = useSceneImageGeneration({
    sceneId: selectedScene?.id?.toString() || null,
    projectId: projectId,
    isActive: isSceneImageModalOpen || isSceneDetailModalOpen,
    onComplete: () => {
      loadScenes();
    }
  });

  const handleRefreshResources = async () => {
    if (!projectId) {
      alert('请先选择项目');
      return;
    }
    await loadCharacters();
    await loadScenes();
  };

  const handleShowSceneDetail = (sceneName: string) => {
    const scene = dbScenes.find(s => s.name === sceneName);
    if (scene) {
      setSelectedScene(scene);
      setIsSceneDetailModalOpen(true);
    } else {
      console.warn('[ResourcePanel] 未找到场景:', sceneName);
    }
  };

  const closeSceneDetailModal = () => {
    setIsSceneDetailModalOpen(false);
    setSelectedScene(null);
  };

  const handleShowSceneImageModal = (sceneName: string) => {
    const scene = dbScenes.find(s => s.name === sceneName);
    if (scene) {
      setSelectedScene(scene);
      setIsSceneImageModalOpen(true);
    } else {
      console.warn('[ResourcePanel] 未找到场景:', sceneName);
    }
  };

  const closeSceneImageModal = () => {
    setIsSceneImageModalOpen(false);
  };

  const handleGenerateSceneImage = async (sceneId: number, imageModelName: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/scenes/${sceneId}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          imageModel: imageModelName, 
          textModel,
          width: 1024, 
          height: 576 
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '启动生成失败');
      }
      
      const data = await res.json();
      console.log('[ResourcePanel] 场景图片生成已启动:', data.jobId);
      
      // 立即触发轮询检测，避免重复点击
      sceneImageGeneration.checkAndResumeNextWorkflow();
    } catch (error: any) {
      console.error('[ResourcePanel] 生成场景图片失败:', error);
      alert('生成场景图片失败: ' + error.message);
      throw error;
    }
  };

  return (
    <div className="w-80 flex flex-col bg-white border-l border-slate-200">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">资源库</h3>
          <Button
            size="sm"
            variant="flat"
            className="bg-green-100 text-green-700 font-medium"
            startContent={<Save className="w-3 h-3" />}
            onPress={handleRefreshResources}
          >
            刷新
          </Button>
        </div>
        <TabButtons activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'characters' && (
          <CharactersTab
            characters={characters}
            dbCharacters={dbCharacters}
            isLoadingCharacters={isLoadingCharacters}
            scenes={scenes}
            onGenerateViews={handleGenerateViewsWrapper}
            onShowDetail={handleShowDetail}
          />
        )}

        {activeTab === 'locations' && (
          <>
            {isLoadingScenes ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">加载场景中...</p>
              </div>
            ) : dbScenes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">暂无场景数据</p>
                <p className="text-xs mt-2">智能分镜生成后会自动提取场景</p>
              </div>
            ) : (
              <LocationsTab
                locations={dbScenes.map(s => s.name)}
                onPreview={(resource) => {
                  handleShowSceneDetail(resource.name);
                }}
                onGenerateImage={(sceneName) => {
                  handleShowSceneImageModal(sceneName);
                }}
              />
            )}
          </>
        )}

        {activeTab === 'props' && (
          <PropsTab
            props={props}
          />
        )}
      </div>

      {/* 弹窗 */}
      <CharacterViewsModal
        isOpen={isViewsModalOpen}
        onClose={closeViewsModal}
        selectedResource={selectedResource}
        isGenerating={isGenerating}
        generatedPrompts={generatedPrompts}
        onGenerate={handleGenerateViews}
        characterId={viewsCharacterId}
        imageModel={imageModel}
        textModel={textModel}
      />

      <CharacterDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        character={selectedCharacter}
        scenes={scenes}
      />

      <SceneDetailModal
        isOpen={isSceneDetailModalOpen}
        onClose={closeSceneDetailModal}
        scene={selectedScene}
        onGenerateImage={handleGenerateSceneImage}
        isGenerating={sceneImageGeneration.isGenerating}
        imageModel={imageModel}
      />

      <SceneImageModal
        isOpen={isSceneImageModalOpen}
        onClose={closeSceneImageModal}
        scene={selectedScene}
        isGenerating={sceneImageGeneration.isGenerating}
        onGenerate={handleGenerateSceneImage}
        imageModel={imageModel}
      />
    </div>
  );
};

export default ResourcePanel;
