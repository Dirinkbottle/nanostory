import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Spinner } from '@heroui/react';
import { Plus, Wand2, RefreshCw, ZoomIn } from 'lucide-react';

const GENERATING_KEY = 'nanostory_generating_images';
const GENERATING_TIMEOUT = 120000; // 2分钟自动过期

interface GeneratingItem {
  id: number;
  startTime: number;
}

interface SceneImageGeneratorProps {
  sceneId: number;
  imageUrl?: string;
  sceneDescription: string;
  onGenerate: (prompt: string) => void;
}

const SceneImageGenerator: React.FC<SceneImageGeneratorProps> = ({
  sceneId,
  imageUrl,
  sceneDescription,
  onGenerate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [prompt, setPrompt] = useState(sceneDescription);
  const [isGenerating, setIsGenerating] = useState(false);

  // 初始化时检查是否有正在生成的状态（自动清除超时项）
  useEffect(() => {
    const items: GeneratingItem[] = JSON.parse(localStorage.getItem(GENERATING_KEY) || '[]');
    const now = Date.now();
    // 过滤掉超时的项目
    const validItems = items.filter(item => now - item.startTime < GENERATING_TIMEOUT);
    // 更新 localStorage
    if (validItems.length !== items.length) {
      localStorage.setItem(GENERATING_KEY, JSON.stringify(validItems));
    }
    // 检查当前分镜是否在生成中
    if (validItems.some(item => item.id === sceneId) && !imageUrl) {
      setIsGenerating(true);
    }
  }, [sceneId, imageUrl]);

  // 图片生成完成后，清除生成状态
  useEffect(() => {
    if (imageUrl && isGenerating) {
      setIsGenerating(false);
      removeGeneratingId(sceneId);
    }
  }, [imageUrl]);

  const addGeneratingId = (id: number) => {
    const items: GeneratingItem[] = JSON.parse(localStorage.getItem(GENERATING_KEY) || '[]');
    if (!items.some(item => item.id === id)) {
      items.push({ id, startTime: Date.now() });
      localStorage.setItem(GENERATING_KEY, JSON.stringify(items));
    }
  };

  const removeGeneratingId = (id: number) => {
    const items: GeneratingItem[] = JSON.parse(localStorage.getItem(GENERATING_KEY) || '[]');
    const newItems = items.filter(item => item.id !== id);
    localStorage.setItem(GENERATING_KEY, JSON.stringify(newItems));
  };

  const handleOpenGenerateModal = () => {
    setPrompt(sceneDescription);
    setIsOpen(true);
  };

  // 直接生成（不弹窗）
  const handleQuickGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    addGeneratingId(sceneId);
    try {
      await onGenerate(sceneDescription);
    } catch (error) {
      console.error('生成图片失败:', error);
      removeGeneratingId(sceneId);
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    addGeneratingId(sceneId);
    try {
      await onGenerate(prompt);
      setIsOpen(false);
    } catch (error) {
      console.error('生成图片失败:', error);
      removeGeneratingId(sceneId);
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* 图片占位区域 */}
      <div className="w-40 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 group transition-all duration-300 border-2 border-dashed border-slate-300 relative overflow-hidden">
        {imageUrl ? (
          <>
            {/* 点击图片预览 */}
            <img 
              src={imageUrl} 
              alt="场景" 
              className="w-full h-full object-cover rounded-xl cursor-pointer" 
              onClick={() => setIsPreviewOpen(true)}
            />
            {/* 悬停时显示操作按钮 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                title="预览大图"
              >
                <ZoomIn className="w-4 h-4 text-slate-700" />
              </button>
              <button
                onClick={handleOpenGenerateModal}
                className="p-2 bg-blue-500/90 rounded-full hover:bg-blue-500 transition-colors"
                title="重新生成"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
            </div>
          </>
        ) : isGenerating ? (
          // 生成中状态
          <div className="flex flex-col items-center gap-2 text-blue-500">
            <Spinner size="lg" color="primary" />
            <span className="text-xs font-semibold">生成中...</span>
          </div>
        ) : (
          // 未生成状态 - 点击直接生成
          <div 
            onClick={handleQuickGenerate}
            className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer w-full h-full justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold">生成图片</span>
          </div>
        )}
      </div>

      {/* 图片预览 Modal */}
      <Modal 
        isOpen={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen}
        size="4xl"
        classNames={{
          base: "bg-black/95",
          closeButton: "text-white hover:bg-white/20"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalBody className="p-4">
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt="场景大图" 
                    className="w-full h-auto max-h-[80vh] object-contain rounded-lg" 
                  />
                )}
              </ModalBody>
              <ModalFooter className="border-t border-white/10">
                <Button 
                  variant="light" 
                  onPress={onClose}
                  className="text-white font-semibold"
                >
                  关闭
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold"
                  onPress={() => {
                    onClose();
                    handleOpenGenerateModal();
                  }}
                  startContent={<RefreshCw className="w-4 h-4" />}
                >
                  重新生成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 生成图片 Modal */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        size="2xl"
        classNames={{
          base: "bg-white",
          header: "border-b border-slate-200",
          body: "py-6",
          footer: "border-t border-slate-200"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-600" />
                <span className="text-slate-800 font-bold">
                  {imageUrl ? '重新生成图片' : '生成分镜图片'}
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      图片描述提示词
                    </label>
                    <Textarea
                      value={prompt}
                      onValueChange={setPrompt}
                      placeholder="描述你想要生成的画面..."
                      minRows={6}
                      classNames={{
                        input: "bg-slate-50 text-slate-800",
                        inputWrapper: "bg-slate-50 border border-slate-200 hover:border-blue-300"
                      }}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      💡 提示：详细描述场景、光线、角色动作等细节，可以获得更好的生成效果
                    </p>
                  </div>

                  {imageUrl && (
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">
                        当前图片
                      </label>
                      <div className="w-full h-48 bg-slate-100 rounded-lg overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="当前场景" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button 
                  variant="light" 
                  onPress={onClose}
                  className="font-semibold"
                >
                  取消
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg hover:shadow-xl"
                  onPress={handleGenerate}
                  isLoading={isGenerating}
                  startContent={!isGenerating && <Wand2 className="w-4 h-4" />}
                >
                  {isGenerating ? '生成中...' : imageUrl ? '重新生成' : '开始生成'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default SceneImageGenerator;
