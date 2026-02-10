import React, { useState, useCallback } from 'react';
import { Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Checkbox } from '@heroui/react';
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
  onUpdateScene?: (id: number, updates: Partial<StoryboardScene>) => void;
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
  onUpdateScene,
  imageTask,
  videoTask
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(scene.description);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const isGeneratingVideo = videoTask?.status === 'pending' || videoTask?.status === 'running';

  // 删除视频（数据库 + MinIO 存储桶）
  const handleDeleteVideo = useCallback(async () => {
    try {
      const token = getAuthToken();
      await fetch(`/api/storyboards/${scene.id}/media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ videoUrl: null })
      });
      if (onUpdateScene) {
        onUpdateScene(scene.id, { videoUrl: undefined });
      }
      console.log('[SceneCard] 已删除视频, sceneId:', scene.id);
    } catch (err) {
      console.error('[SceneCard] 删除视频失败:', err);
    }
  }, [scene.id, onUpdateScene]);

  // 删除首尾帧（动作镜头同时删除首帧和尾帧）
  const handleDeleteFrames = useCallback(async () => {
    try {
      const token = getAuthToken();
      await fetch(`/api/storyboards/${scene.id}/media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ startFrame: null, endFrame: null })
      });
      // 更新本地状态
      if (onUpdateScene) {
        onUpdateScene(scene.id, { startFrame: undefined, endFrame: undefined, imageUrl: undefined });
      }
      console.log('[SceneCard] 已删除首尾帧, sceneId:', scene.id);
    } catch (err) {
      console.error('[SceneCard] 删除首尾帧失败:', err);
    }
  }, [scene.id, onUpdateScene]);

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
        scriptId || undefined,
        scene.id
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
            ? 'border-2 border-blue-500/50 shadow-md shadow-blue-500/10 bg-slate-800/80'
            : 'border border-slate-700/50 hover:border-blue-500/30 bg-slate-900/60'
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
                onDeleteVideo={handleDeleteVideo}
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
                onDeleteFrames={handleDeleteFrames}
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
        onDeleteVideo={handleDeleteVideo}
        showVideoPreview={showVideoPreview}
        setShowVideoPreview={setShowVideoPreview}
        isModal
      />

      {/* 删除确认弹窗 */}
      <Modal isOpen={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} size="sm" classNames={{ base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-red-400">删除分镜</ModalHeader>
              <ModalBody>
                <p className="text-sm text-slate-300">
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
                  <span className="text-xs text-slate-400">本集不再提示</span>
                </Checkbox>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" size="sm" onPress={onClose} className="bg-slate-800/80 text-slate-300">
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
