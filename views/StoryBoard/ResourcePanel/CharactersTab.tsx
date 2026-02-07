import React from 'react';
import { Chip } from '@heroui/react';
import { Character, ResourceItem } from './types';
import CharacterCard from './CharacterCard';
import SimpleCharacterCard from './SimpleCharacterCard';

interface CharactersTabProps {
  characters: string[];
  dbCharacters: Character[];
  isLoadingCharacters: boolean;
  scenes?: any[];
  onGenerateViews: (charName: string, characterId: number) => void;
  onShowDetail: (character: Character) => void;
  onPreview?: (character: Character) => void;
}

const CharactersTab: React.FC<CharactersTabProps> = ({
  characters,
  dbCharacters,
  isLoadingCharacters,
  scenes,
  onGenerateViews,
  onShowDetail,
  onPreview
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700">
          全部角色 ({dbCharacters.length > 0 ? dbCharacters.length : characters.length})
        </span>
        {dbCharacters.length === 0 && characters.length > 0 && (
          <Chip size="sm" color="warning" variant="flat">
            未提取
          </Chip>
        )}
      </div>
      
      {isLoadingCharacters ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-slate-500">加载中...</p>
        </div>
      ) : dbCharacters.length > 0 ? (
        dbCharacters.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            scenes={scenes}
            onGenerateViews={onGenerateViews}
            onShowDetail={onShowDetail}
          />
        ))
      ) : characters.length > 0 ? (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-yellow-800">
              💡 检测到 {characters.length} 个角色，点击顶部"提取角色"按钮可获取详细信息
            </p>
          </div>
          {characters.map((char, idx) => (
            <SimpleCharacterCard
              key={idx}
              name={char}
              scenes={scenes}
              onGenerateViews={onGenerateViews}
              onPreview={onPreview || (() => {})}
            />
          ))}
        </>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <span className="text-4xl block mb-2">👤</span>
          <p className="text-sm">暂无角色</p>
          <p className="text-xs mt-1">生成分镜后自动识别</p>
        </div>
      )}
    </div>
  );
};

export default CharactersTab;
