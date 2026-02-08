import React, { useState, useCallback } from 'react';
import { Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Checkbox } from '@heroui/react';
import { ImagePlus } from 'lucide-react';
import SceneImageGenerator from '../SceneImageGenerator';
import { StoryboardScene } from '../useSceneManager';
import { TaskState } from '../../../hooks/useTaskRunner';
import SceneCardHeader from './SceneCardHeader';
import SceneCardContent from './SceneCardContent';
import SceneCardMetadata from './SceneCardMetadata';
import SceneCardActions from './SceneCardActions';
import VideoPreviewModal from './VideoPreviewModal';
import { getAuthToken } from '../../../services/auth';
import { validateFrameReadiness, formatValidationMessage } from '../utils/validateFrameReadiness';

export interface SceneCardProps {
  scene: StoryboardScene;
  index: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  projectId?: number | null;
  scriptId?: number | null;
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
  projectId,
  scriptId,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const isGeneratingVideo = videoTask?.status === 'pending' || videoTask?.status === 'running';

  const handleSaveDescription = () => {
    onUpdateDescription(scene.id, editedDescription);
    setIsEditingDescription(false);
  };

  // localStorage key: 按 scriptId 存储"不再提示"状态
  const SKIP_DELETE_CONFIRM_KEY = `skipDeleteConfirm_${scriptId || 'default'}`;

  const handleDeleteClick = useCallback((id: number) => {
    const skipConfirm = localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === 'true';
    if (skipConfirm) {
      onDelete(id);
    } else {
      setShowDeleteConfirm(true);
    }
  }, [SKIP_DELETE_CONFIRM_KEY, onDelete]);

  const handleConfirmDelete = () => {
    if (dontAskAgain) {
      localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, 'true');
    }
    setShowDeleteConfirm(false);
    setDontAskAgain(false);
    onDelete(scene.id);
  };

  // 预检：生成首尾帧前校验角色+场景字段完整性（前端本地校验）
  const validateForFrame = async (): Promise<{ ready: boolean; blocking: boolean; message?: string }> => {
    if (!projectId) return { ready: true, blocking: false };
    try {
      const result = await validateFrameReadiness(
        projectId,
        scene.characters || [],
        scene.location || '',
        scriptId || undefined
      );
      if (!result.ready) {
        const msg = formatValidationMessage(result);
        return {
          ready: false,
          blocking: result.blockingIssues.length > 0,
          message: msg
        };
      }
      return { ready: true, blocking: false };
    } catch {
      return { ready: true, blocking: false };
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
      if (check.blocking) {
        // 阻止性问题：不允许继续
        alert(`无法生成首尾帧：\n\n${check.message}`);
        return { success: false, error: '校验未通过' };
      }
      // 警告性问题：允许用户选择是否继续
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
              <div className="flex flex-col gap-1.5">
                <VideoPreviewModal
                  scene={scene}
                  index={index}
                  isGeneratingVideo={isGeneratingVideo}
                  onGenerateVideo={handleGenerateVideo}
                  showVideoPreview={showVideoPreview}
                  setShowVideoPreview={setShowVideoPreview}
                />
                <button
                  onClick={() => onGenerateImage(scene.id, scene.description)}
                  className="w-40 px-2 py-1 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 flex items-center justify-center gap-1 transition-all shadow-sm hover:shadow"
                  title="重新生成首尾帧（不影响已有视频）"
                >
                  <ImagePlus className="w-3 h-3" />
                  重新生成帧
                </button>
              </div>
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
                onDelete={handleDeleteClick}
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

      {/* 删除确认弹窗 */}
      <Modal isOpen={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-red-600">删除分镜</ModalHeader>
              <ModalBody>
                <p className="text-sm text-slate-700">
                  确定要删除分镜 <span className="font-bold">#{index + 1}</span> 吗？此操作不可撤销。
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  仅删除分镜记录，不会影响角色和场景数据。
                </p>
                <Checkbox
                  size="sm"
                  isSelected={dontAskAgain}
                  onValueChange={setDontAskAgain}
                  className="mt-2"
                >
                  <span className="text-xs text-slate-500">本集不再提示</span>
                </Checkbox>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" size="sm" onPress={onClose}>
                  取消
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 text-white font-semibold hover:bg-red-600"
                  onPress={handleConfirmDelete}
                >
                  确认删除
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
