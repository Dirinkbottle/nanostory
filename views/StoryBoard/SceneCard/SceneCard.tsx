import React, { useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import SceneImageGenerator from '../SceneImageGenerator';
import { StoryboardScene } from '../useSceneManager';
import { TaskState } from '../../../hooks/useTaskRunner';
import SceneCardHeader from './SceneCardHeader';
import SceneCardContent from './SceneCardContent';
import SceneCardMetadata from './SceneCardMetadata';
import SceneCardActions from './SceneCardActions';
import VideoPreviewModal from './VideoPreviewModal';

export interface SceneCardProps {
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
  onGenerateVideo: (id: number) => Promise<{ success: boolean; error?: string }>;
  imageTask?: TaskState;
  videoTask?: TaskState;
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
  onGenerateVideo,
  imageTask,
  videoTask
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(scene.description);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const isGeneratingVideo = videoTask?.status === 'pending' || videoTask?.status === 'running';

  const handleSaveDescription = () => {
    onUpdateDescription(scene.id, editedDescription);
    setIsEditingDescription(false);
  };

  const handleGenerateVideo = async () => {
    if (!scene.imageUrl) {
      alert('请先生成图片');
      return;
    }
    const result = await onGenerateVideo(scene.id);
    if (!result.success) {
      alert(result.error || '视频生成失败');
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
            <SceneCardHeader
              index={index}
              sceneId={scene.id}
              isFirst={isFirst}
              isLast={isLast}
              onSelect={onSelect}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />

            {scene.videoUrl ? (
              <VideoPreviewModal
                scene={scene}
                index={index}
                isGeneratingVideo={isGeneratingVideo}
                onGenerateVideo={handleGenerateVideo}
                showVideoPreview={showVideoPreview}
                setShowVideoPreview={setShowVideoPreview}
              />
            ) : (
              <SceneImageGenerator
                sceneId={scene.id}
                startFrame={scene.startFrame}
                endFrame={scene.endFrame}
                sceneDescription={scene.description}
                onGenerate={(prompt) => onGenerateImage(scene.id, prompt)}
              />
            )}

            <div className="flex-1 min-w-0">
              <SceneCardContent
                scene={scene}
                isEditingDescription={isEditingDescription}
                editedDescription={editedDescription}
                onEditedDescriptionChange={setEditedDescription}
                onSaveDescription={handleSaveDescription}
                onStartEditing={() => setIsEditingDescription(true)}
                onDelete={onDelete}
              />

              <SceneCardMetadata scene={scene} />

              <SceneCardActions
                scene={scene}
                isGeneratingVideo={isGeneratingVideo}
                onGenerateVideo={handleGenerateVideo}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <VideoPreviewModal
        scene={scene}
        index={index}
        isGeneratingVideo={isGeneratingVideo}
        onGenerateVideo={handleGenerateVideo}
        showVideoPreview={showVideoPreview}
        setShowVideoPreview={setShowVideoPreview}
        isModal
      />
    </>
  );
};

export default SceneCard;
