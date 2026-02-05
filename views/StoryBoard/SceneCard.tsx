import React, { useState } from 'react';
import { Card, CardBody, Chip, Textarea } from '@heroui/react';
import { ChevronUp, ChevronDown, Trash2, Mic, Wand2, Play, Edit2, Check } from 'lucide-react';
import SceneImageGenerator from './SceneImageGenerator';

interface StoryboardScene {
  id: number;
  order: number;
  description: string;
  dialogue: string;
  duration: number;
  imageUrl?: string;
  characters: string[];
  props: string[];
  location: string;
}

interface SceneCardProps {
  scene: StoryboardScene;
  index: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateDescription: (id: number, description: string) => void;
  onGenerateImage: (id: number, prompt: string) => void;
}

const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  index,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdateDescription,
  onGenerateImage
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(scene.description);

  const handleSaveDescription = () => {
    onUpdateDescription(scene.id, editedDescription);
    setIsEditingDescription(false);
  };
  return (
    <Card
      className={`transition-all ${
        isSelected
          ? 'border-2 border-blue-500 shadow-md bg-blue-50'
          : 'border border-slate-200 hover:border-blue-300'
      }`}
    >
      <CardBody className="p-4">
        <div className="flex gap-4">
          {/* 序号和操作 */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onSelect(scene.id)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
            >
              <span className="text-sm font-bold text-slate-700">{index + 1}</span>
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(scene.id);
                }}
                disabled={isFirst}
                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(scene.id);
                }}
                disabled={isLast}
                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 图片生成区域 */}
          <SceneImageGenerator
            imageUrl={scene.imageUrl}
            sceneDescription={scene.description}
            onGenerate={(prompt) => onGenerateImage(scene.id, prompt)}
          />

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onValueChange={setEditedDescription}
                      minRows={3}
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "bg-white border border-blue-300"
                      }}
                    />
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      保存
                    </button>
                  </div>
                ) : (
                  <div className="group">
                    <div className="flex items-start gap-2">
                      <p className="text-sm text-slate-700 leading-relaxed flex-1">
                        {scene.description || '暂无描述'}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingDescription(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    {scene.dialogue && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        💬 {scene.dialogue}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(scene.id);
                }}
                className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* 资源信息 */}
            <div className="space-y-3 mt-3">
              {/* 场景位置 */}
              {scene.location && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">场景</span>
                  <Chip size="sm" variant="flat" className="bg-purple-100 text-purple-700 text-xs font-medium">
                    📍 {scene.location}
                  </Chip>
                  <Chip size="sm" variant="flat" className="bg-green-100 text-green-700 text-xs font-medium">
                    ⏱️ {scene.duration}s
                  </Chip>
                </div>
              )}

              {/* 角色列表 */}
              {scene.characters.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-2 block">角色</span>
                  <div className="flex flex-wrap gap-2">
                    {scene.characters.map((char, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">
                          👤
                        </div>
                        <span className="text-xs font-medium text-blue-700">{char}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 道具列表 */}
              {scene.props.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 mb-2 block">道具</span>
                  <div className="flex flex-wrap gap-2">
                    {scene.props.map((prop, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-amber-50 rounded-lg px-2 py-1 border border-amber-200">
                        <div className="w-6 h-6 rounded bg-amber-200 flex items-center justify-center text-xs">
                          🎬
                        </div>
                        <span className="text-xs font-medium text-amber-700">{prop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-lg flex items-center gap-1 transition-all shadow-sm hover:shadow">
                <Mic className="w-3 h-3" />
                配音
              </button>
              <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 rounded-lg flex items-center gap-1 transition-all shadow-sm hover:shadow">
                <Wand2 className="w-3 h-3" />
                特效
              </button>
              <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg flex items-center gap-1 transition-all shadow-sm hover:shadow">
                <Play className="w-3 h-3" />
                预览
              </button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default SceneCard;
