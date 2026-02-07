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
import { getAuthToken } from '../../../services/auth';

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

  // 预检：生成首尾帧前校验角色图+场景图完整性
  const validateForFrame = async (): Promise<{ ready: boolean; message?: string }> => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/${scene.id}/validate?type=frame`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) return { ready: true }; // API 失败时不阻塞
      const data = await res.json();
      if (!data.ready) {
        const msg = data.issues.map((i: any) => i.message).join('\n');
        return { ready: false, message: msg };
      }
      return { ready: true };
    } catch {
      return { ready: true }; // 网络错误不阻塞
    }
  };

  // 预检：生成视频前校验首尾帧+提示词完整性
  const validateForVideo = async (): Promise<{ ready: boolean; message?: string }> => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/${scene.id}/validate?type=video`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) return { ready: true };
      const data = await res.json();
      if (!data.ready) {
        const msg = data.issues.map((i: any) => i.message).join('\n');
        return { ready: false, message: msg };
      }
      return { ready: true };
    } catch {
      return { ready: true };
    }
  };

  // 带预检的图片生成
  const handleGenerateImageWithValidation = async (prompt: string) => {
    const check = await validateForFrame();
    if (!check.ready) {
      const proceed = window.confirm(
        `以下资产不完整，生成效果可能不一致：\n\n${check.message}\n\n是否仍然继续生成？`
      );
      if (!proceed) return { success: false, error: '用户取消' };
    }
    return onGenerateImage(scene.id, prompt);
  };

  const handleGenerateVideo = async () => {
    const check = await validateForVideo();
    if (!check.ready) {
      alert(`无法生成视频：\n\n${check.message}`);
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
                hasAction={scene.hasAction}
                sceneDescription={scene.description}
                onGenerate={handleGenerateImageWithValidation}
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
