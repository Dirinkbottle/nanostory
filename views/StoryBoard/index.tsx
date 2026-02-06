import React, { useState, useEffect } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Checkbox } from '@heroui/react';
import { Wand2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getAuthToken } from '../../services/auth';
import SceneList from './SceneList';
import ResourcePanel from './ResourcePanel';

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

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

interface StoryBoardProps {
  scriptId?: number | null;
  episodeNumber?: number;
  scripts?: Script[];
  onEpisodeChange?: (episodeNumber: number, scriptId: number) => void;
}

const StoryBoard: React.FC<StoryBoardProps> = ({ 
  scriptId, 
  episodeNumber = 1,
  scripts = [],
  onEpisodeChange
}) => {
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentScriptId, setCurrentScriptId] = useState<number | null>(scriptId || null);
  const [currentEpisode, setCurrentEpisode] = useState(episodeNumber);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 同步外部传入的 scriptId
  useEffect(() => {
    if (scriptId !== currentScriptId) {
      setCurrentScriptId(scriptId || null);
    }
  }, [scriptId]);

  useEffect(() => {
    if (episodeNumber !== currentEpisode) {
      setCurrentEpisode(episodeNumber);
    }
  }, [episodeNumber]);

  // 从数据库加载已有分镜
  useEffect(() => {
    if (currentScriptId) {
      loadStoryboards(currentScriptId);
    } else {
      setScenes([]);
    }
  }, [currentScriptId]);

  const loadStoryboards = async (targetScriptId: number) => {
    if (!targetScriptId) return;
    
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/${targetScriptId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const loadedScenes: StoryboardScene[] = data.map((item: any, index: number) => {
            const vars = item.variables || {};
            return {
              id: item.id || Date.now() + index,
              order: item.index || index + 1,
              description: item.prompt_template || '',
              dialogue: vars.dialogue || '',
              duration: vars.duration || 3,
              imageUrl: item.image_ref || undefined,
              videoUrl: vars.videoUrl || undefined,
              characters: vars.characters || [],
              props: vars.props || [],
              location: vars.location || '',
              // 新增字段
              shotType: vars.shotType || '',
              emotion: vars.emotion || '',
              hasAction: vars.hasAction || false,
              startFrame: vars.startFrame || '',
              endFrame: vars.endFrame || ''
            };
          });
          setScenes(loadedScenes);
          if (loadedScenes.length > 0) {
            setSelectedScene(loadedScenes[0].id);
          }
        } else {
          setScenes([]);
        }
      }
    } catch (error) {
      console.error('加载分镜失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 切换集数
  const handleEpisodeSelect = (script: Script) => {
    setCurrentScriptId(script.id);
    setCurrentEpisode(script.episode_number);
    if (onEpisodeChange) {
      onEpisodeChange(script.episode_number, script.id);
    }
  };

  // 点击自动分镜按钮
  const handleAutoGenerateClick = () => {
    if (!currentScriptId) {
      alert('请先选择或生成一个剧本');
      return;
    }
    
    // 检查是否已设置"不再提示"
    const skipConfirm = sessionStorage.getItem('skipStoryboardConfirm') === 'true';
    
    if (skipConfirm || scenes.length === 0) {
      // 不需要确认，直接执行
      executeAutoGenerate();
    } else {
      // 显示确认弹窗
      setShowConfirmModal(true);
    }
  };

  // 确认后执行自动分镜
  const handleConfirmGenerate = () => {
    if (dontShowAgain) {
      sessionStorage.setItem('skipStoryboardConfirm', 'true');
    }
    setShowConfirmModal(false);
    executeAutoGenerate();
  };

  // 自动生成分镜
  const executeAutoGenerate = async () => {

    setIsGenerating(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/auto-generate/${currentScriptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      // 转换为前端格式
      const newScenes: StoryboardScene[] = data.scenes.map((scene: any, index: number) => ({
        id: Date.now() + index,
        order: scene.order || index + 1,
        description: scene.description || '',
        dialogue: scene.dialogue || '',
        duration: scene.duration || 5,
        characters: scene.characters || [],
        props: scene.props || [],
        location: scene.location || ''
      }));

      setScenes(newScenes);
      if (newScenes.length > 0) {
        setSelectedScene(newScenes[0].id);
      }
      alert(data.message);
    } catch (error: any) {
      alert(error.message || '自动生成分镜失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 收集所有角色、地点、道具
  const allCharacters = [...new Set(scenes.flatMap(s => s.characters))];
  const allLocations = [...new Set(scenes.map(s => s.location).filter(Boolean))];
  const allProps = [...new Set(scenes.flatMap(s => s.props))];

  const handleAddScene = () => {
    const newScene: StoryboardScene = {
      id: Date.now(),
      order: scenes.length + 1,
      description: '',
      dialogue: '',
      duration: 5,
      characters: [],
      props: [],
      location: ''
    };
    setScenes([...scenes, newScene]);
  };

  const handleDeleteScene = (id: number) => {
    setScenes(scenes.filter(s => s.id !== id));
  };

  const handleMoveScene = (id: number, direction: 'up' | 'down') => {
    const index = scenes.findIndex(s => s.id === id);
    if (direction === 'up' && index > 0) {
      const newScenes = [...scenes];
      [newScenes[index], newScenes[index - 1]] = [newScenes[index - 1], newScenes[index]];
      setScenes(newScenes);
    } else if (direction === 'down' && index < scenes.length - 1) {
      const newScenes = [...scenes];
      [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
      setScenes(newScenes);
    }
  };

  const handleUpdateDescription = (id: number, description: string) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, description } : s));
  };

  const handleGenerateImage = async (id: number, prompt: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/images/generate-frames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prompt,
          width: 640,
          height: 360
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || '图片生成失败');
      }
      
      // 更新本地状态（首尾帧两张图）
      setScenes((prev: StoryboardScene[]) => prev.map(s => 
        s.id === id 
          ? { ...s, startFrame: data.startFrame, endFrame: data.endFrame, imageUrl: data.startFrame } 
          : s
      ));
      
      // 保存到数据库
      await fetch(`/api/storyboards/${id}/media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          imageUrl: data.startFrame,
          startFrame: data.startFrame,
          endFrame: data.endFrame
        })
      });
      
      if (data.message) {
        alert(data.message);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('图片生成失败:', error);
      return { success: false, error: error.message || '图片生成失败' };
    }
  };

  // 更新视频 URL
  const handleUpdateVideo = async (id: number, videoUrl: string) => {
    const token = getAuthToken();
    
    // 更新本地状态（使用函数式更新）
    setScenes((prev: StoryboardScene[]) => prev.map(s => 
      s.id === id 
        ? { ...s, videoUrl } 
        : s
    ));
    
    // 保存到数据库
    try {
      await fetch(`/api/storyboards/${id}/media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ videoUrl })
      });
    } catch (error) {
      console.error('保存视频路径失败:', error);
    }
  };

  const handleReorderScenes = (newScenes: StoryboardScene[]) => {
    setScenes(newScenes);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 顶部工具栏 */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">分镜设计</h2>
          
          {/* 集数选择器 */}
          {scripts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">集数:</span>
              <div className="flex gap-1">
                {scripts.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleEpisodeSelect(s)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      currentEpisode === s.episode_number
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    第{s.episode_number}集
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {scenes.length > 0 && (
            <span className="text-sm text-slate-500">共 {scenes.length} 个分镜</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="bg-slate-100 text-slate-600 font-medium"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={() => currentScriptId && loadStoryboards(currentScriptId)}
            isLoading={isLoading}
            isDisabled={!currentScriptId}
          >
            刷新
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold"
            startContent={<Wand2 className="w-4 h-4" />}
            onPress={handleAutoGenerateClick}
            isLoading={isGenerating}
            isDisabled={!currentScriptId}
          >
            {isGenerating ? '生成中...' : '从剧本自动分镜'}
          </Button>
        </div>
      </div>

      {/* 无剧本提示 */}
      {!currentScriptId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Wand2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">请先生成剧本</p>
            <p className="text-sm mt-1">生成剧本后，可以自动将剧本转换为分镜</p>
          </div>
        </div>
      )}

      {/* 分镜内容 */}
      {currentScriptId && (
        <div className="flex-1 flex overflow-hidden">
          <SceneList
            scenes={scenes}
            selectedScene={selectedScene}
            onSelectScene={setSelectedScene}
            onMoveScene={handleMoveScene}
            onDeleteScene={handleDeleteScene}
            onAddScene={handleAddScene}
            onUpdateDescription={handleUpdateDescription}
            onGenerateImage={handleGenerateImage}
            onUpdateVideo={handleUpdateVideo}
            onReorderScenes={handleReorderScenes}
          />
          <ResourcePanel
            characters={allCharacters.length > 0 ? allCharacters : ['主角', '配角']}
            locations={allLocations.length > 0 ? allLocations : ['室内', '室外']}
            props={allProps.length > 0 ? allProps : ['道具']}
            scenes={scenes}
          />
        </div>
      )}

      {/* 自动分镜确认弹窗 */}
      <Modal 
        isOpen={showConfirmModal} 
        onOpenChange={setShowConfirmModal}
        size="md"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                确认重新生成分镜
              </ModalHeader>
              <ModalBody>
                <p className="text-slate-700">
                  重新生成分镜将<span className="text-red-500 font-semibold">覆盖当前所有分镜内容</span>，此操作不可撤销。
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  确定要继续吗？
                </p>
                <div className="mt-4">
                  <Checkbox 
                    isSelected={dontShowAgain}
                    onValueChange={setDontShowAgain}
                    size="sm"
                  >
                    <span className="text-sm text-slate-600">本次登录不再提示</span>
                  </Checkbox>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold"
                  onPress={handleConfirmGenerate}
                >
                  确认重新生成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default StoryBoard;
