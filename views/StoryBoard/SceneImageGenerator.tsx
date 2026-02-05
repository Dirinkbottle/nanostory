import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea } from '@heroui/react';
import { Plus, Wand2, RefreshCw } from 'lucide-react';

interface SceneImageGeneratorProps {
  imageUrl?: string;
  sceneDescription: string;
  onGenerate: (prompt: string) => void;
}

const SceneImageGenerator: React.FC<SceneImageGeneratorProps> = ({
  imageUrl,
  sceneDescription,
  onGenerate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(sceneDescription);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpen = () => {
    setPrompt(sceneDescription);
    setIsOpen(true);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(prompt);
      setIsOpen(false);
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* 图片占位区域 */}
      <div
        onClick={handleOpen}
        className="w-40 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer group hover:from-blue-50 hover:to-blue-100 transition-all duration-300 border-2 border-dashed border-slate-300 hover:border-blue-400 relative overflow-hidden"
      >
        {imageUrl ? (
          <>
            <img 
              src={imageUrl} 
              alt="场景" 
              className="w-full h-full object-cover rounded-xl" 
            />
            {/* 悬停时显示重新生成按钮 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-white">
                <RefreshCw className="w-6 h-6" />
                <span className="text-xs font-medium">重新生成</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold">生成图片</span>
          </div>
        )}
      </div>

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
