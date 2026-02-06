import React, { useState } from 'react';
import { Card, CardBody, Chip, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from '@heroui/react';
import { ChevronUp, ChevronDown, Trash2, Mic, Wand2, Play, Edit2, Check, Clapperboard, Video, Film } from 'lucide-react';
import SceneImageGenerator from './SceneImageGenerator';
import { getAuthToken } from '../../services/auth';

interface StoryboardScene {
  id: number;
  order: number;
  description: string;
  dialogue: string;
  duration: number;
  imageUrl?: string;
  videoUrl?: string;
  characters: string[];
  props: string[];
  location: string;
  // 新增字段
  shotType?: string;
  emotion?: string;
  hasAction?: boolean;
  startFrame?: string;
  endFrame?: string;
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
  onGenerateImage: (id: number, prompt: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateVideo: (id: number, videoUrl: string) => void;
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
  onGenerateImage,
  onUpdateVideo
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(scene.description);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const handleSaveDescription = () => {
    onUpdateDescription(scene.id, editedDescription);
    setIsEditingDescription(false);
  };

  // 生成视频
  const handleGenerateVideo = async () => {
    if (!scene.imageUrl) {
      alert('请先生成图片');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      const token = getAuthToken();
      // 对于有动作的镜头，使用首尾帧生成；否则使用单图生成
      const requestBody = scene.hasAction && scene.startFrame && scene.endFrame
        ? {
            prompt: scene.description,
            startFrame: scene.startFrame,
            endFrame: scene.endFrame,
            imageUrl: scene.imageUrl,
            duration: scene.duration || 3
          }
        : {
            prompt: scene.description,
            imageUrl: scene.imageUrl,
            duration: scene.duration || 2
          };

      const res = await fetch('/api/videos/generate-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || '视频生成失败');
      }

      onUpdateVideo(scene.id, data.videoUrl);
      alert('视频生成成功！');
    } catch (error: any) {
      alert(error.message || '视频生成失败');
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  return (
    <>
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

          {/* 媒体展示区域：视频优先，其次图片 */}
          {scene.videoUrl ? (
            <div className="w-40 h-24 rounded-xl flex-shrink-0 relative overflow-hidden group border-2 border-orange-300 bg-black">
              <video 
                src={scene.videoUrl}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setShowVideoPreview(true)}
                muted
                loop
                autoPlay
                playsInline
              />
              {/* 悬停显示操作 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowVideoPreview(true)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="预览视频"
                >
                  <Play className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  className="p-2 bg-orange-500/90 rounded-full hover:bg-orange-500 transition-colors disabled:opacity-50"
                  title="重新生成视频"
                >
                  {isGeneratingVideo ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Film className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              {/* 视频标识 */}
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded font-bold">
                视频
              </div>
            </div>
          ) : (
            <SceneImageGenerator
              sceneId={scene.id}
              startFrame={scene.startFrame}
              endFrame={scene.endFrame}
              sceneDescription={scene.description}
              onGenerate={(prompt) => onGenerateImage(scene.id, prompt)}
            />
          )}

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
              {/* 镜头类型和场景位置 */}
              <div className="flex items-center gap-2 flex-wrap">
                {scene.shotType && (
                  <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-700 text-xs font-medium">
                    🎬 {scene.shotType}
                  </Chip>
                )}
                {scene.location && (
                  <Chip size="sm" variant="flat" className="bg-purple-100 text-purple-700 text-xs font-medium">
                    📍 {scene.location}
                  </Chip>
                )}
                <Chip size="sm" variant="flat" className="bg-green-100 text-green-700 text-xs font-medium">
                  ⏱️ {scene.duration}s
                </Chip>
                {scene.emotion && (
                  <Chip size="sm" variant="flat" className="bg-pink-100 text-pink-700 text-xs font-medium">
                    💫 {scene.emotion}
                  </Chip>
                )}
                {scene.hasAction && (
                  <Chip size="sm" variant="flat" className="bg-orange-100 text-orange-700 text-xs font-bold">
                    🎭 有动作
                  </Chip>
                )}
              </div>

              {/* 首尾帧 - 仅在有动作时显示 */}
              {scene.hasAction && (scene.startFrame || scene.endFrame) && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-orange-700">动作帧（用于生成视频）</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {scene.startFrame && (
                      <div className="bg-white rounded-md p-2 border border-orange-100">
                        <span className="text-xs font-semibold text-green-600 block mb-1">▶ 首帧</span>
                        <p className="text-xs text-slate-600">{scene.startFrame}</p>
                      </div>
                    )}
                    {scene.endFrame && (
                      <div className="bg-white rounded-md p-2 border border-orange-100">
                        <span className="text-xs font-semibold text-red-600 block mb-1">◼ 尾帧</span>
                        <p className="text-xs text-slate-600">{scene.endFrame}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 角色列表 */}
              {scene.characters && scene.characters.length > 0 && (
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
              {!scene.videoUrl && (
                <button 
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !scene.imageUrl}
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 rounded-lg flex items-center gap-1 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Spinner size="sm" color="white" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Film className="w-3 h-3" />
                      生成视频
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    {/* 视频预览弹窗 */}
    <Modal 
      isOpen={showVideoPreview} 
      onOpenChange={setShowVideoPreview}
      size="2xl"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              视频预览 - 分镜 {index + 1}
            </ModalHeader>
            <ModalBody>
              {scene.videoUrl ? (
                <video 
                  src={scene.videoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg"
                  style={{ maxHeight: '60vh' }}
                />
              ) : (
                <div className="text-center py-10 text-slate-500">
                  暂无视频
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                关闭
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
    </>
  );
};

export default SceneCard;
