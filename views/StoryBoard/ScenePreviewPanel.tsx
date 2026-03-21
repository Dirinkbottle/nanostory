import React, { useState, useEffect, useCallback } from 'react';
import { Button, Textarea, Chip } from '@heroui/react';
import { ImageIcon, Video, Film, Camera, Users, MapPin, Zap, Edit3, Save, X, Play, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { StoryboardScene } from './useSceneManager';
import { TaskState } from '../../hooks/useTaskRunner';
import { getAuthToken } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { validateFrameReadiness, formatValidationMessage } from './utils/validateFrameReadiness';
import SketchPanel from './SceneCard/SketchPanel';
import ShotLanguageEditor from './components/ShotLanguageEditor';
import ShotLanguageBadge from './components/ShotLanguageBadge';

interface ScenePreviewPanelProps {
  scene: StoryboardScene | null;
  sceneIndex: number;
  projectId?: number | null;
  scriptId?: number | null;
  onUpdateDescription: (description: string) => Promise<boolean>;
  onGenerateImage: (id: number, prompt: string) => Promise<{ success: boolean; error?: string }>;
  onGenerateVideo: (id: number) => Promise<{ success: boolean; error?: string }>;
  onUpdateScene?: (updates: Partial<StoryboardScene>) => void;
  imageTask?: TaskState;
  videoTask?: TaskState;
}

const ScenePreviewPanel: React.FC<ScenePreviewPanelProps> = ({
  scene,
  sceneIndex,
  projectId,
  scriptId,
  onUpdateDescription,
  onGenerateImage,
  onGenerateVideo,
  onUpdateScene,
  imageTask,
  videoTask
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [showStartFrame, setShowStartFrame] = useState(true);
  const [showShotLanguageEditor, setShowShotLanguageEditor] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // 同步场景描述
  useEffect(() => {
    if (scene && !isEditingDescription) {
      setEditedDescription(scene.description);
    }
  }, [scene?.description, scene?.id, isEditingDescription]);

  const isGeneratingImage = imageTask?.status === 'pending' || imageTask?.status === 'running';
  const isGeneratingVideo = videoTask?.status === 'pending' || videoTask?.status === 'running';

  // 保存描述
  const handleSaveDescription = async () => {
    if (isSavingDescription || !scene) return;
    
    setIsSavingDescription(true);
    const success = await onUpdateDescription(editedDescription);
    setIsSavingDescription(false);
    
    if (success) {
      setIsEditingDescription(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditedDescription(scene?.description || '');
    setIsEditingDescription(false);
  };

  // 预检：生成首尾帧前校验
  const validateForFrame = async (): Promise<{ ready: boolean; blocking: boolean; message?: string }> => {
    if (!projectId || !scene) return { ready: true, blocking: false };
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

  // 预检：生成视频前校验
  const validateForVideo = async (): Promise<{ ready: boolean; message?: string }> => {
    if (!scene) return { ready: true };
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

  // 生成首尾帧
  const handleGenerateImage = async () => {
    if (!scene) return;
    
    const check = await validateForFrame();
    if (!check.ready) {
      if (check.blocking) {
        showToast(`无法生成首尾帧：${check.message}`, 'error');
        return;
      }
      const proceed = await confirm({
        title: '资产不完整',
        message: `以下资产不完整，生成效果可能不一致：\n\n${check.message}\n\n是否仍然继续生成？`,
        type: 'warning',
        confirmText: '继续生成'
      });
      if (!proceed) return;
    }
    
    const result = await onGenerateImage(scene.id, scene.description);
    if (!result.success) {
      showToast(result.error || '图片生成失败', 'error');
    }
  };

  // 生成视频
  const handleGenerateVideo = async () => {
    if (!scene) return;
    
    const check = await validateForVideo();
    if (!check.ready) {
      showToast(`无法生成视频：${check.message}`, 'error');
      return;
    }
    
    const result = await onGenerateVideo(scene.id);
    if (!result.success) {
      showToast(result.error || '视频生成失败', 'error');
    }
  };

  // 删除帧
  const handleDeleteFrames = useCallback(async () => {
    if (!scene) return;
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
      if (onUpdateScene) {
        onUpdateScene({ startFrame: undefined, endFrame: undefined, imageUrl: undefined });
      }
      showToast('已删除首尾帧', 'success');
    } catch (err) {
      console.error('[ScenePreviewPanel] 删除首尾帧失败:', err);
      showToast('删除失败', 'error');
    }
  }, [scene, onUpdateScene, showToast]);

  // 删除视频
  const handleDeleteVideo = useCallback(async () => {
    if (!scene) return;
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
        onUpdateScene({ videoUrl: undefined });
      }
      showToast('已删除视频', 'success');
    } catch (err) {
      console.error('[ScenePreviewPanel] 删除视频失败:', err);
      showToast('删除失败', 'error');
    }
  }, [scene, onUpdateScene, showToast]);

  // 空状态
  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-app)]">
        <div className="text-center">
          <Film className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">选择一个分镜以查看详情</p>
        </div>
      </div>
    );
  }

  // 判断当前显示的媒体
  const hasFrames = scene.startFrame || scene.endFrame;
  const hasVideo = !!scene.videoUrl;
  const currentFrame = showStartFrame ? scene.startFrame : scene.endFrame;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-app)]">
      {/* 预览区域 */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {hasVideo ? (
          // 视频预览
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              src={scene.videoUrl}
              controls
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              style={{ maxHeight: 'calc(100% - 2rem)' }}
            />
            <button
              onClick={handleDeleteVideo}
              className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-red-500/80 text-white transition-colors"
              title="删除视频"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : hasFrames ? (
          // 帧图片预览
          <div className="relative w-full h-full flex items-center justify-center">
            {currentFrame && (
              <img
                src={currentFrame}
                alt={`分镜 ${sceneIndex + 1} - ${showStartFrame ? '首帧' : '尾帧'}`}
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                style={{ maxHeight: 'calc(100% - 2rem)' }}
              />
            )}
            
            {/* 帧切换控制 */}
            {scene.hasAction && scene.startFrame && scene.endFrame && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <button
                  onClick={() => setShowStartFrame(true)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    showStartFrame ? 'bg-[var(--accent)] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  首帧
                </button>
                <button
                  onClick={() => setShowStartFrame(false)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !showStartFrame ? 'bg-[var(--accent)] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  尾帧
                </button>
              </div>
            )}

            {/* 删除帧按钮 */}
            <button
              onClick={handleDeleteFrames}
              className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-red-500/80 text-white transition-colors"
              title="删除首尾帧"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // 无媒体时的占位
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-32 h-20 rounded-lg border-2 border-dashed border-[var(--border-color)] flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">暂无预览图片</p>
            <Button
              size="sm"
              className="pro-btn-primary"
              startContent={<ImageIcon className="w-4 h-4" />}
              onPress={handleGenerateImage}
              isLoading={isGeneratingImage}
              isDisabled={isGeneratingImage}
            >
              生成首尾帧
            </Button>
          </div>
        )}
      </div>

      {/* 信息和操作区域 */}
      <div className="flex-shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
        {/* 元数据 */}
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              分镜 #{sceneIndex + 1}
            </span>
            <div className="flex items-center gap-1.5">
              {scene.shotType && (
                <Chip size="sm" variant="flat" className="bg-cyan-500/20 text-cyan-400 text-xs">
                  <Camera className="w-3 h-3 mr-1" />
                  {scene.shotType}
                </Chip>
              )}
              {scene.hasAction && (
                <Chip size="sm" variant="flat" className="bg-amber-500/20 text-amber-400 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  动作镜头
                </Chip>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {scene.characters && scene.characters.length > 0 && (
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <Users className="w-3 h-3" />
                <span>{scene.characters.join(', ')}</span>
              </div>
            )}
            {scene.location && (
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <MapPin className="w-3 h-3" />
                <span>{scene.location}</span>
              </div>
            )}
            {scene.duration && (
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <Video className="w-3 h-3" />
                <span>{scene.duration}s</span>
              </div>
            )}
          </div>
        </div>

        {/* 描述编辑 */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              分镜描述
            </span>
            {!isEditingDescription && (
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-1 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                minRows={3}
                maxRows={6}
                classNames={{
                  input: "text-sm text-[var(--text-primary)]",
                  inputWrapper: "bg-[var(--bg-app)] border-[var(--border-color)]"
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={handleCancelEdit}
                  className="bg-transparent text-[var(--text-muted)]"
                  startContent={<X className="w-3.5 h-3.5" />}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  className="pro-btn-primary"
                  onPress={handleSaveDescription}
                  isLoading={isSavingDescription}
                  startContent={<Save className="w-3.5 h-3.5" />}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">
              {scene.description || '暂无描述'}
            </p>
          )}
        </div>

        {/* 草图面板 */}
        <div className="px-4 py-3 border-t border-[var(--border-color)]">
          <SketchPanel
            storyboardId={scene.id}
            sketchUrl={scene.sketchUrl}
            sketchType={scene.sketchType}
            sketchData={scene.sketchData}
            controlStrength={scene.controlStrength}
            backgroundImage={scene.startFrame}
            onSketchChange={(updates) => {
              if (onUpdateScene) {
                onUpdateScene(updates);
              }
            }}
          />
        </div>

        {/* 镜头语言参数 */}
        <div className="px-4 py-3 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowShotLanguageEditor(!showShotLanguageEditor)}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              镜头语言参数
              {showShotLanguageEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {scene.shotLanguage && Object.keys(scene.shotLanguage).length > 0 && !showShotLanguageEditor && (
              <ShotLanguageBadge shotLanguage={scene.shotLanguage} compact />
            )}
          </div>
          {showShotLanguageEditor && (
            <ShotLanguageEditor
              storyboardId={scene.id}
              initialValues={scene.shotLanguage || {}}
              onChange={(values) => {
                if (onUpdateScene) {
                  onUpdateScene({ shotLanguage: values });
                }
              }}
              onSave={(values) => {
                if (onUpdateScene) {
                  onUpdateScene({ shotLanguage: values });
                }
              }}
            />
          )}
        </div>

        {/* 生成操作 */}
        <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center gap-2">
          <Button
            size="sm"
            className={hasFrames 
              ? "bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              : "pro-btn-primary"
            }
            startContent={<ImageIcon className="w-4 h-4" />}
            onPress={handleGenerateImage}
            isLoading={isGeneratingImage}
            isDisabled={isGeneratingImage || isGeneratingVideo}
          >
            {hasFrames ? '重新生成帧' : '生成首尾帧'}
          </Button>
          
          {hasFrames && (
            <Button
              size="sm"
              className={hasVideo
                ? "bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }
              startContent={<Film className="w-4 h-4" />}
              onPress={handleGenerateVideo}
              isLoading={isGeneratingVideo}
              isDisabled={isGeneratingImage || isGeneratingVideo}
            >
              {hasVideo ? '重新生成视频' : '生成视频'}
            </Button>
          )}

          {/* 状态提示 */}
          {(isGeneratingImage || isGeneratingVideo) && (
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              {isGeneratingImage ? '正在生成图片...' : '正在生成视频...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenePreviewPanel;
