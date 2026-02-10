import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { Image as ImageIcon, Wand2 } from 'lucide-react';
import { Scene } from './useSceneData';

interface SceneImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene | null;
  isGenerating: boolean;
  onGenerate: (sceneId: number, imageModel: string) => void;
  imageModel: string;
}

const SceneImageModal: React.FC<SceneImageModalProps> = ({
  isOpen,
  onClose,
  scene,
  isGenerating,
  onGenerate,
  imageModel
}) => {
  const handleGenerate = () => {
    if (scene && imageModel) {
      onGenerate(scene.id, imageModel);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
      <ModalContent className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
        {(onCloseModal) => (
          <>
            <ModalHeader className="text-slate-100 font-bold">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                场景图片生成 - {scene?.name}
              </div>
            </ModalHeader>
            <ModalBody>
              {/* 已生成的图片 */}
              {scene?.image_url && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">当前场景图片</h3>
                  <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                    <img 
                      src={scene.image_url} 
                      alt={scene.name} 
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* 场景信息预览 */}
              <div className="mb-6 bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">场景信息</h3>
                <div className="space-y-2 text-sm">
                  {scene?.description && (
                    <div>
                      <span className="font-medium text-slate-400">描述：</span>
                      <span className="text-slate-300">{scene.description}</span>
                    </div>
                  )}
                  {scene?.environment && (
                    <div>
                      <span className="font-medium text-slate-400">环境：</span>
                      <span className="text-slate-300">{scene.environment}</span>
                    </div>
                  )}
                  {scene?.lighting && (
                    <div>
                      <span className="font-medium text-slate-400">光照：</span>
                      <span className="text-slate-300">{scene.lighting}</span>
                    </div>
                  )}
                  {scene?.mood && (
                    <div>
                      <span className="font-medium text-slate-400">氛围：</span>
                      <span className="text-slate-300">{scene.mood}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 模型信息 */}
              <div className="mb-4">
                {imageModel ? (
                  <p className="text-sm text-slate-500">使用图片模型：<span className="font-medium text-slate-300">{imageModel}</span></p>
                ) : (
                  <p className="text-sm text-amber-600">请先点击右上角「AI 模型」按钮选择图片模型</p>
                )}
              </div>

              {/* 生成状态 */}
              {isGenerating && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-500 mb-4"></div>
                    <p className="text-slate-400">正在生成场景图片...</p>
                    <p className="text-xs text-slate-400 mt-2">这可能需要几分钟时间</p>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onCloseModal} isDisabled={isGenerating}>
                关闭
              </Button>
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={handleGenerate}
                isLoading={isGenerating}
                isDisabled={!imageModel || !scene || isGenerating}
              >
                {scene?.image_url ? '重新生成' : '开始生成'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SceneImageModal;
