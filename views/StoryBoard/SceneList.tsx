import React, { useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Plus, Images, Video } from 'lucide-react';
import SceneCard from './SceneCard';
import { StoryboardScene } from './useSceneManager';
import { TaskState } from '../../hooks/useTaskRunner';

interface SceneListProps {
  scenes: StoryboardScene[];
  selectedScene: number | null;
  projectId?: number | null;
  scriptId?: number | null;
  onSelectScene: (id: number) => void;
  onMoveScene: (id: number, direction: 'up' | 'down') => void;
  onDeleteScene: (id: number) => void;
  onAddScene: () => void;
  onUpdateDescription: (id: number, description: string) => void;
  onGenerateImage: (id: number, prompt: string) => Promise<{ success: boolean; error?: string }>;
  onGenerateVideo: (id: number) => Promise<{ success: boolean; error?: string }>;
  onUpdateScene?: (id: number, updates: Partial<StoryboardScene>) => void;
  tasks: Record<string, TaskState>;
  onReorderScenes: (newScenes: StoryboardScene[]) => void;
  onBatchGenerate?: (overwriteFrames: boolean) => void;
  isBatchGenerating?: boolean;
  batchProgress?: number;
  onBatchGenerateVideo?: (overwriteVideos: boolean) => void;
  isBatchGeneratingVideo?: boolean;
  batchVideoProgress?: number;
}

const SceneList: React.FC<SceneListProps> = ({
  scenes,
  selectedScene,
  projectId,
  scriptId,
  onSelectScene,
  onMoveScene,
  onDeleteScene,
  onAddScene,
  onUpdateDescription,
  onGenerateImage,
  onGenerateVideo,
  onUpdateScene,
  tasks,
  onReorderScenes,
  onBatchGenerate,
  isBatchGenerating = false,
  batchProgress = 0,
  onBatchGenerateVideo,
  isBatchGeneratingVideo = false,
  batchVideoProgress = 0
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showBatchVideoModal, setShowBatchVideoModal] = useState(false);

  // 统计已有帧的镜头数
  const scenesWithFrames = scenes.filter(s => s.startFrame).length;
  const totalScenes = scenes.length;

  // 统计已有视频的分镜数
  const scenesWithVideos = scenes.filter(s => s.videoUrl).length;

  const handleBatchClick = () => {
    if (!onBatchGenerate || scenes.length === 0) return;
    if (scenesWithFrames > 0) {
      setShowBatchModal(true);
    } else {
      onBatchGenerate(false);
    }
  };

  const handleBatchVideoClick = () => {
    if (!onBatchGenerateVideo || scenes.length === 0) return;
    if (scenesWithVideos > 0) {
      setShowBatchVideoModal(true);
    } else {
      onBatchGenerateVideo(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(dropIndex, 0, draggedScene);
    
    onReorderScenes(newScenes);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  return (
    <div className="flex-1 flex flex-col border-r border-slate-700/50 bg-slate-900/40">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">分镜列表</h2>
          <div className="flex items-center gap-2">
            {onBatchGenerate && scenes.length > 0 && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600"
                startContent={<Images className="w-4 h-4" />}
                onPress={handleBatchClick}
                isLoading={isBatchGenerating}
                isDisabled={isBatchGenerating || isBatchGeneratingVideo}
              >
                {isBatchGenerating ? `生成中 ${batchProgress}%` : '生成所有'}
              </Button>
            )}
            {onBatchGenerateVideo && scenes.length > 0 && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600"
                startContent={<Video className="w-4 h-4" />}
                onPress={handleBatchVideoClick}
                isLoading={isBatchGeneratingVideo}
                isDisabled={isBatchGeneratingVideo || isBatchGenerating}
              >
                {isBatchGeneratingVideo ? `生成视频 ${batchVideoProgress}%` : '生成所有视频'}
              </Button>
            )}
            <Button
              size="sm"
              className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold"
              startContent={<Plus className="w-4 h-4" />}
              onPress={onAddScene}
            >
              添加分镜
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-200 ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            } ${
              dragOverIndex === index ? 'transform translate-y-2' : ''
            }`}
          >
            <SceneCard
              scene={scene}
              index={index}
              isSelected={selectedScene === scene.id}
              isFirst={index === 0}
              isLast={index === scenes.length - 1}
              projectId={projectId}
              scriptId={scriptId}
              onSelect={onSelectScene}
              onMoveUp={(id) => onMoveScene(id, 'up')}
              onMoveDown={(id) => onMoveScene(id, 'down')}
              onDelete={onDeleteScene}
              onUpdateDescription={onUpdateDescription}
              onGenerateImage={onGenerateImage}
              onGenerateVideo={onGenerateVideo}
              onUpdateScene={onUpdateScene}
              imageTask={tasks[`img_${scene.id}`]}
              videoTask={tasks[`vid_${scene.id}`]}
            />
          </div>
        ))}
      </div>
      {/* 批量生成确认弹窗 */}
      <Modal isOpen={showBatchModal} onOpenChange={setShowBatchModal} size="sm" classNames={{ base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-100">检测到已有帧图片</ModalHeader>
              <ModalBody>
                <p className="text-sm text-slate-300">
                  当前 {totalScenes} 个分镜中，已有 <span className="font-bold text-orange-400">{scenesWithFrames}</span> 个分镜已生成帧图片。
                </p>
                <p className="text-sm text-slate-400 mt-1">请选择处理方式：</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={onClose}
                  className="bg-slate-800/80 text-slate-300"
                >
                  取消
                </Button>
                <Button
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold"
                  onPress={() => {
                    onClose();
                    onBatchGenerate?.(false);
                  }}
                >
                  跳过已有
                </Button>
                <Button
                  className="bg-orange-500 text-white font-semibold"
                  onPress={() => {
                    onClose();
                    onBatchGenerate?.(true);
                  }}
                >
                  全部覆盖
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 批量视频生成确认弹窗 */}
      <Modal isOpen={showBatchVideoModal} onOpenChange={setShowBatchVideoModal} size="sm" classNames={{ base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-100">检测到已有视频</ModalHeader>
              <ModalBody>
                <p className="text-sm text-slate-300">
                  当前 {totalScenes} 个分镜中，已有 <span className="font-bold text-purple-400">{scenesWithVideos}</span> 个分镜已生成视频。
                </p>
                <p className="text-sm text-slate-400 mt-1">请选择处理方式：</p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={onClose}
                  className="bg-slate-800/80 text-slate-300"
                >
                  取消
                </Button>
                <Button
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold"
                  onPress={() => {
                    onClose();
                    onBatchGenerateVideo?.(false);
                  }}
                >
                  跳过已有
                </Button>
                <Button
                  className="bg-purple-500 text-white font-semibold"
                  onPress={() => {
                    onClose();
                    onBatchGenerateVideo?.(true);
                  }}
                >
                  全部覆盖
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SceneList;
