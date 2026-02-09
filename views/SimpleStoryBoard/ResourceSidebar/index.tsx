import React, { useState } from 'react';
import { Character } from '../../StoryBoard/ResourcePanel/types';
import { Scene } from '../../StoryBoard/ResourcePanel/useSceneData';
import ResourceListView from './ResourceListView';
import CharacterDetailView from './CharacterDetailView';
import SceneDetailView from './SceneDetailView';

type SidebarView =
  | { mode: 'list' }
  | { mode: 'character-detail'; character: Character }
  | { mode: 'scene-detail'; scene: Scene }
  | { mode: 'prop-detail'; propName: string };

type TabType = 'character' | 'scene' | 'prop';

interface ResourceSidebarProps {
  dbCharacters: Character[];
  dbScenes: Scene[];
  props: string[];
  /** 分镜中实际使用的角色名 */
  usedCharacterNames: string[];
  /** 分镜中实际使用的场景名 */
  usedSceneNames: string[];
  imageModel?: string;
  textModel?: string;
  onGenerateCharacterImage?: (characterId: number, imageModel: string) => void;
  onGenerateSceneImage?: (sceneId: number, imageModel: string) => void;
  onBatchGenerate?: () => void;
  /** 外部可以通过此回调打开指定角色详情 */
  selectedCharacterName?: string | null;
  selectedSceneName?: string | null;
  onClearSelection?: () => void;
}

const ResourceSidebar: React.FC<ResourceSidebarProps> = ({
  dbCharacters,
  dbScenes,
  props,
  usedCharacterNames,
  usedSceneNames,
  imageModel,
  textModel,
  onGenerateCharacterImage,
  onGenerateSceneImage,
  onBatchGenerate,
  selectedCharacterName,
  selectedSceneName,
  onClearSelection,
}) => {
  const [view, setView] = useState<SidebarView>({ mode: 'list' });
  const [activeTab, setActiveTab] = useState<TabType>('character');

  // 外部点击角色头像时自动切换到详情
  React.useEffect(() => {
    if (selectedCharacterName) {
      const char = dbCharacters.find(c => c.name === selectedCharacterName);
      if (char) {
        setView({ mode: 'character-detail', character: char });
        setActiveTab('character');
      }
      onClearSelection?.();
    }
  }, [selectedCharacterName, dbCharacters]);

  React.useEffect(() => {
    if (selectedSceneName) {
      const scene = dbScenes.find(s => s.name === selectedSceneName);
      if (scene) {
        setView({ mode: 'scene-detail', scene });
        setActiveTab('scene');
      }
      onClearSelection?.();
    }
  }, [selectedSceneName, dbScenes]);

  const goBack = () => setView({ mode: 'list' });

  return (
    <div className="w-72 flex flex-col bg-slate-900 border-l border-slate-700/50">
      {view.mode === 'list' && (
        <ResourceListView
          dbCharacters={dbCharacters}
          dbScenes={dbScenes}
          props={props}
          usedCharacterNames={usedCharacterNames}
          usedSceneNames={usedSceneNames}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCharacterClick={(c) => setView({ mode: 'character-detail', character: c })}
          onSceneClick={(s) => setView({ mode: 'scene-detail', scene: s })}
          onPropClick={() => {}}
          onBatchGenerate={onBatchGenerate}
        />
      )}

      {view.mode === 'character-detail' && (
        <CharacterDetailView
          character={view.character}
          onBack={goBack}
          onGenerateImage={onGenerateCharacterImage}
          imageModel={imageModel}
        />
      )}

      {view.mode === 'scene-detail' && (
        <SceneDetailView
          scene={view.scene}
          onBack={goBack}
          onGenerateImage={onGenerateSceneImage}
          imageModel={imageModel}
        />
      )}
    </div>
  );
};

export default ResourceSidebar;
