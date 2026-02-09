import React, { useState } from 'react';
import { Button, Textarea } from '@heroui/react';
import { ArrowLeft, Upload, Sparkles } from 'lucide-react';
import { Scene } from '../../StoryBoard/ResourcePanel/useSceneData';

interface SceneDetailViewProps {
  scene: Scene;
  onBack: () => void;
  onGenerateImage?: (sceneId: number, imageModel: string) => void;
  imageModel?: string;
}

const SceneDetailView: React.FC<SceneDetailViewProps> = ({ scene, onBack, onGenerateImage, imageModel }) => {
  const [description, setDescription] = useState(
    [scene.description, scene.environment, scene.lighting, scene.mood].filter(Boolean).join('\n')
  );

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
        <button onClick={onBack} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500">返回场景列表</span>
        <span className="ml-auto text-sm font-semibold text-emerald-400">场景详情</span>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 场景图片 */}
        <div className="rounded-xl border-2 border-dashed border-slate-600 overflow-hidden bg-slate-800/50 aspect-video flex items-center justify-center">
          {scene.image_url ? (
            <img src={scene.image_url} alt={scene.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <span className="text-3xl">🏞️</span>
              <p className="text-xs">暂无场景图片</p>
              <p className="text-[10px] text-slate-600">编辑描述后点击生成</p>
            </div>
          )}
        </div>

        {/* 名字 */}
        <div className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
          <span className="text-sm font-semibold text-slate-200">{scene.name}</span>
        </div>

        {/* 参考图 + 描述 */}
        <div className="flex items-start gap-3">
          <button className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-all w-20 shrink-0">
            <Upload className="w-5 h-5" />
            <span className="text-[10px]">上传</span>
            <span className="text-[10px]">参考图</span>
          </button>
          <Textarea
            value={description}
            onValueChange={setDescription}
            minRows={5}
            maxRows={10}
            placeholder="场景环境、光照、氛围描述..."
            classNames={{
              input: 'text-xs text-slate-300 bg-transparent',
              inputWrapper: 'bg-slate-800 border border-slate-700 hover:border-slate-500',
            }}
          />
        </div>
      </div>

      {/* 底部 */}
      <div className="px-4 py-3 border-t border-slate-700/50">
        <Button
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm"
          startContent={<Sparkles className="w-4 h-4" />}
          onPress={() => {
            if (scene.id && imageModel && onGenerateImage) {
              onGenerateImage(scene.id, imageModel);
            }
          }}
          isDisabled={!imageModel || !scene.id}
        >
          AI 生成场景图
        </Button>
      </div>
    </div>
  );
};

export default SceneDetailView;
