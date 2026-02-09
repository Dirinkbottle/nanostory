import React, { useState } from 'react';
import { Button, Textarea } from '@heroui/react';
import { ArrowLeft, Upload, Mic, Sparkles } from 'lucide-react';
import { Character } from '../../StoryBoard/ResourcePanel/types';

interface CharacterDetailViewProps {
  character: Character;
  onBack: () => void;
  onGenerateImage?: (characterId: number, imageModel: string) => void;
  imageModel?: string;
}

const CharacterDetailView: React.FC<CharacterDetailViewProps> = ({ character, onBack, onGenerateImage, imageModel }) => {
  const [description, setDescription] = useState(
    character.description || character.appearance || ''
  );

  const mainImage = character.imageUrl || character.frontViewUrl || character.characterSheetUrl;

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500">返回角色列表</span>
        <span className="ml-auto text-sm font-semibold text-cyan-400">角色详情</span>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 角色图片 */}
        <div className="rounded-xl border-2 border-dashed border-slate-600 overflow-hidden bg-slate-800/50 aspect-square flex items-center justify-center">
          {mainImage ? (
            <img src={mainImage} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
              <p className="text-xs">暂无角色图片</p>
              <p className="text-[10px] text-slate-600">编辑下方描述后点击生成</p>
            </div>
          )}
        </div>

        {/* 名字 + 语音 + 本地图 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <span className="text-sm font-semibold text-slate-200">{character.name}</span>
          </div>
          <button className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="语音">
            <Mic className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors" title="上传本地图片">
            <Upload className="w-4 h-4" />
          </button>
        </div>

        {/* 参考图上传 */}
        <div className="flex items-center gap-3">
          <button className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-all w-20">
            <Upload className="w-5 h-5" />
            <span className="text-[10px]">上传AI</span>
            <span className="text-[10px]">参考图</span>
          </button>
          <div className="flex-1">
            <Textarea
              value={description}
              onValueChange={setDescription}
              minRows={5}
              maxRows={10}
              placeholder="角色外貌、性格、服装等描述..."
              classNames={{
                input: 'text-xs text-slate-300 bg-transparent',
                inputWrapper: 'bg-slate-800 border border-slate-700 hover:border-slate-500',
              }}
            />
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="px-4 py-3 border-t border-slate-700/50 flex items-center gap-2">
        <button className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200" title="设置">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <Button
          className="flex-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-semibold text-sm"
          startContent={<Sparkles className="w-4 h-4" />}
          onPress={() => {
            if (character.id && imageModel && onGenerateImage) {
              onGenerateImage(character.id, imageModel);
            }
          }}
          isDisabled={!imageModel || !character.id}
        >
          AI 生图
        </Button>
      </div>
    </div>
  );
};

export default CharacterDetailView;
