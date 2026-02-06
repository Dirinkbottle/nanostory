import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { Layers, Wand2 } from 'lucide-react';
import { ResourceItem } from './types';
import AIModelSelector, { AIModel } from '../../../components/AIModelSelector';
import { getAuthToken } from '../../../services/auth';

interface CharacterViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedResource: ResourceItem | null;
  isGenerating: boolean;
  generatedPrompts: any;
  onGenerate: (charName: string, modelName: string, characterId?: number) => void;
  characterId?: number;
}

const CharacterViewsModal: React.FC<CharacterViewsModalProps> = ({
  isOpen,
  onClose,
  selectedResource,
  isGenerating,
  generatedPrompts,
  onGenerate,
  characterId
}) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // 加载图片生成模型
  useEffect(() => {
    const loadModels = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/ai-models?type=IMAGE', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
          const data = await res.json();
          const imageModels = data.models || [];
          setModels(imageModels);
          
          // 默认选择第一个模型
          if (imageModels.length > 0 && !selectedModel) {
            setSelectedModel(imageModels[0].name);
          }
        }
      } catch (error) {
        console.error('加载模型失败:', error);
      }
    };

    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
      <ModalContent className="bg-white">
        {(onCloseModal) => (
          <>
            <ModalHeader className="text-slate-800 font-bold">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                角色三视图 - {selectedResource?.name}
              </div>
            </ModalHeader>
            <ModalBody>
              {(selectedResource?.frontViewUrl || selectedResource?.sideViewUrl || selectedResource?.backViewUrl) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">已生成的三视图</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* 正面视图 */}
                    <div className="border rounded-lg p-2">
                      <p className="text-xs text-slate-600 mb-2">正面视图</p>
                      {selectedResource.frontViewUrl ? (
                        <img src={selectedResource.frontViewUrl} alt="正面视图" className="w-full h-48 object-cover rounded" />
                      ) : (
                        <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm">
                          {selectedResource.generationStatus === 'generating' ? '生成中...' : '未生成'}
                        </div>
                      )}
                    </div>
                    
                    {/* 侧面视图 */}
                    <div className="border rounded-lg p-2">
                      <p className="text-xs text-slate-600 mb-2">侧面视图</p>
                      {selectedResource.sideViewUrl ? (
                        <img src={selectedResource.sideViewUrl} alt="侧面视图" className="w-full h-48 object-cover rounded" />
                      ) : (
                        <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm">
                          {selectedResource.generationStatus === 'generating' ? '生成中...' : '未生成'}
                        </div>
                      )}
                    </div>
                    
                    {/* 背面视图 */}
                    <div className="border rounded-lg p-2">
                      <p className="text-xs text-slate-600 mb-2">背面视图</p>
                      {selectedResource.backViewUrl ? (
                        <img src={selectedResource.backViewUrl} alt="背面视图" className="w-full h-48 object-cover rounded" />
                      ) : (
                        <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm">
                          {selectedResource.generationStatus === 'generating' ? '生成中...' : '未生成'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI 模型选择器 */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  {selectedResource?.frontViewUrl ? '重新生成三视图' : '生成三视图'}
                </h3>
                <AIModelSelector
                  label="图片生成模型"
                  description="选择用于生成三视图的 AI 模型"
                  models={models}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  filterType="IMAGE"
                  size="md"
                  isDisabled={isGenerating}
                />
              </div>

              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-purple-600 mb-4"></div>
                    <p className="text-slate-600">正在生成三视图...</p>
                  </div>
                </div>
              ) : generatedPrompts ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 mb-4">
                    以下是生成的三视图提示词，可用于 AI 绘图工具（如 Stable Diffusion、Midjourney）
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="w-full h-32 bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-4xl">👤</span>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">正面</h4>
                      <p className="text-xs text-slate-600 line-clamp-3">{generatedPrompts.front}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="w-full h-32 bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-4xl">👤</span>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">侧面</h4>
                      <p className="text-xs text-slate-600 line-clamp-3">{generatedPrompts.side}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="w-full h-32 bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-4xl">👤</span>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">背面</h4>
                      <p className="text-xs text-slate-600 line-clamp-3">{generatedPrompts.back}</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 mt-4">
                    <h4 className="font-bold text-purple-800 mb-2">完整设计稿提示词</h4>
                    <p className="text-sm text-purple-700">{generatedPrompts.characterSheet}</p>
                  </div>
                </div>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onCloseModal}>关闭</Button>
              <Button 
                className="bg-purple-600 text-white font-semibold"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={() => onGenerate(selectedResource?.name || '', selectedModel, characterId)}
                isLoading={isGenerating}
                isDisabled={!selectedModel || isGenerating}
              >
                {generatedPrompts ? '重新生成' : '开始生成'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CharacterViewsModal;
