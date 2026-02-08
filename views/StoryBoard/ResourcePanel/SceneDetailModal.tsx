import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip } from '@heroui/react';
import { MapPin, Wand2, Loader2 } from 'lucide-react';
import { getAuthToken } from '../../../services/auth';

interface Scene {
  id: number;
  name: string;
  description?: string;
  environment?: string;
  lighting?: string;
  mood?: string;
  image_url?: string;
  tags?: string;
  source?: string;
  generation_status?: string;
}

interface SceneDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene | null;
  onGenerateImage?: (sceneId: number, imageModel: string) => Promise<void>;
  isGenerating?: boolean;
  imageModel?: string;
}

const SceneDetailModal: React.FC<SceneDetailModalProps> = ({
  isOpen,
  onClose,
  scene,
  onGenerateImage,
  isGenerating = false,
  imageModel = ''
}) => {
  const [generating, setGenerating] = useState(false);

  if (!scene) return null;

  const handleGenerateImage = async () => {
    if (!onGenerateImage || !scene.id) return;
    
    setGenerating(true);
    try {
      await onGenerateImage(scene.id, imageModel);
    } catch (error) {
      console.error('生成场景图片失败:', error);
    } finally {
      setGenerating(false);
    }
  };

  const tags = scene.tags ? scene.tags.split(',').filter(t => t.trim()) : [];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent className="bg-white">
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800">{scene.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {scene.source && (
                    <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600">
                      {scene.source === 'ai_extracted' ? 'AI提取' : '本地'}
                    </Chip>
                  )}
                  {scene.generation_status && (
                    <Chip 
                      size="sm" 
                      variant="flat" 
                      className={
                        scene.generation_status === 'completed' ? 'bg-green-100 text-green-700' :
                        scene.generation_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        scene.generation_status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }
                    >
                      {scene.generation_status === 'completed' ? '已生成' :
                       scene.generation_status === 'processing' ? '生成中' :
                       scene.generation_status === 'failed' ? '生成失败' :
                       '待生成'}
                    </Chip>
                  )}
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="space-y-6">
                {/* 场景图片 */}
                {scene.image_url && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-2xl bg-slate-100 rounded-lg overflow-hidden">
                      <img 
                        src={scene.image_url} 
                        alt={scene.name} 
                        className="w-full h-auto object-cover" 
                      />
                    </div>
                  </div>
                )}

                {/* 场景描述 */}
                {scene.description && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-slate-500 rounded"></span>
                      场景描述
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {scene.description}
                    </p>
                  </div>
                )}

                {/* 环境描述 */}
                {scene.environment && (
                  <div className="bg-gradient-to-br from-green-50 to-slate-50 rounded-lg p-4 border border-green-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-500 rounded"></span>
                      环境描述
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {scene.environment}
                    </p>
                  </div>
                )}

                {/* 光照描述 */}
                {scene.lighting && (
                  <div className="bg-gradient-to-br from-yellow-50 to-slate-50 rounded-lg p-4 border border-yellow-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-yellow-500 rounded"></span>
                      光照描述
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {scene.lighting}
                    </p>
                  </div>
                )}

                {/* 氛围描述 */}
                {scene.mood && (
                  <div className="bg-gradient-to-br from-purple-50 to-slate-50 rounded-lg p-4 border border-purple-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded"></span>
                      氛围描述
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {scene.mood}
                    </p>
                  </div>
                )}

                {/* 标签 */}
                {tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">标签</h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Chip key={index} size="sm" variant="flat" className="bg-slate-100 text-slate-600">
                          {tag.trim()}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* 图片生成控制 */}
                {onGenerateImage && (
                  <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-blue-600" />
                      生成场景图片
                    </h4>
                    <div className="space-y-3">
                      {imageModel ? (
                        <p className="text-sm text-slate-500">使用图片模型：<span className="font-medium text-slate-700">{imageModel}</span></p>
                      ) : (
                        <p className="text-sm text-amber-600">请先点击右上角「AI 模型」按钮选择图片模型</p>
                      )}

                      <Button
                        color="primary"
                        size="sm"
                        startContent={generating || isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        onPress={handleGenerateImage}
                        isDisabled={generating || isGenerating || !imageModel}
                        className="w-full"
                      >
                        {generating || isGenerating ? '生成中...' : '生成场景图片'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-slate-200">
              <Button color="default" variant="light" onPress={onCloseModal}>
                关闭
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SceneDetailModal;
