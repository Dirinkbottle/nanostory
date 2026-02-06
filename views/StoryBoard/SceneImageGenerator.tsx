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
  startFrame?: string;
  endFrame?: string;
  sceneDescription: string;
  onGenerate: (prompt: string) => Promise<{ success: boolean; error?: string }>;
}

const SceneImageGenerator: React.FC<SceneImageGeneratorProps> = ({
  sceneId,
  startFrame,
  endFrame,
  sceneDescription,
  onGenerate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [prompt, setPrompt] = useState(sceneDescription);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 判断是否有图片
  const hasImages = startFrame || endFrame;

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
    if (validItems.some(item => item.id === sceneId) && !hasImages) {
      setIsGenerating(true);
    }
  }, [sceneId, hasImages]);

  // 图片生成完成后，清除生成状态
  useEffect(() => {
    if (hasImages && isGenerating) {
      setIsGenerating(false);
      setError(null);
      removeGeneratingId(sceneId);
    }
  }, [hasImages, isGenerating, sceneId]);

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
    setError(null);
    setIsOpen(true);
  };

  // 直接生成（不弹窗）
  const handleQuickGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    addGeneratingId(sceneId);
    
    const result = await onGenerate(sceneDescription);
    
    if (!result.success) {
      // 生成失败，清除状态并显示错误
      removeGeneratingId(sceneId);
      setIsGenerating(false);
      setError(result.error || '生成失败');
    }
    // 成功的情况由 useEffect 监听 hasImages 变化处理
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    addGeneratingId(sceneId);
    
    const result = await onGenerate(prompt);
    
    if (!result.success) {
      removeGeneratingId(sceneId);
      setIsGenerating(false);
      setError(result.error || '生成失败');
    } else {
      setIsOpen(false);
    }
  };

  const openPreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsPreviewOpen(true);
  };

  return (
    <>
      {/* 首尾帧显示区域 */}
      <div className="flex gap-2 flex-shrink-0">
        {/* 首帧 */}
        <div className="w-20 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group transition-all duration-300 border border-slate-300 relative overflow-hidden">
          {startFrame ? (
            <>
              <img 
                src={startFrame} 
                alt="首帧" 
                className="w-full h-full object-cover rounded-lg cursor-pointer" 
                onClick={() => openPreview(startFrame)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button
                  onClick={() => openPreview(startFrame)}
                  className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="预览"
                >
                  <ZoomIn className="w-3 h-3 text-slate-700" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">首帧</div>
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-1 text-blue-500">
              <Spinner size="sm" color="primary" />
              <span className="text-[10px]">生成中</span>
            </div>
          ) : (
            <div 
              onClick={handleQuickGenerate}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer w-full h-full justify-center"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px]">首帧</span>
            </div>
          )}
        </div>

        {/* 尾帧 */}
        <div className="w-20 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group transition-all duration-300 border border-slate-300 relative overflow-hidden">
          {endFrame ? (
            <>
              <img 
                src={endFrame} 
                alt="尾帧" 
                className="w-full h-full object-cover rounded-lg cursor-pointer" 
                onClick={() => openPreview(endFrame)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button
                  onClick={() => openPreview(endFrame)}
                  className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="预览"
                >
                  <ZoomIn className="w-3 h-3 text-slate-700" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">尾帧</div>
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-1 text-blue-500">
              <Spinner size="sm" color="primary" />
              <span className="text-[10px]">等待</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-300 w-full h-full justify-center">
              <Plus className="w-4 h-4" />
              <span className="text-[10px]">尾帧</span>
            </div>
          )}
        </div>

        {/* 重新生成按钮 */}
        {hasImages && (
          <button
            onClick={handleOpenGenerateModal}
            className="w-8 h-14 bg-slate-100 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors border border-slate-300"
            title="重新生成首尾帧"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 hover:text-blue-600" />
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}

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
                {previewImage && (
                  <img 
                    src={previewImage} 
                    alt="预览大图" 
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
                  {hasImages ? '重新生成首尾帧' : '生成首尾帧'}
                </span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      画面描述提示词
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
                      将根据描述自动生成首帧和尾帧两张图片
                    </p>
                  </div>

                  {hasImages && (
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">
                        当前首尾帧
                      </label>
                      <div className="flex gap-4">
                        {startFrame && (
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 mb-1">首帧</p>
                            <img src={startFrame} alt="首帧" className="w-full h-32 object-cover rounded-lg" />
                          </div>
                        )}
                        {endFrame && (
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 mb-1">尾帧</p>
                            <img src={endFrame} alt="尾帧" className="w-full h-32 object-cover rounded-lg" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
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
                  {isGenerating ? '生成中...' : hasImages ? '重新生成' : '开始生成'}
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
