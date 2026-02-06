import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Select, SelectItem } from '@heroui/react';
import { Image as ImageIcon, Wand2 } from 'lucide-react';
import AIModelSelector, { AIModel } from '../../../components/AIModelSelector';
import { getAuthToken } from '../../../services/auth';
import { Scene } from './useSceneData';

interface SceneImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene | null;
  isGenerating: boolean;
  onGenerate: (sceneId: number, style: string, modelName: string) => void;
}

const STYLE_OPTIONS = [
  { value: '写实风格', label: '写实风格' },
  { value: '动漫风格', label: '动漫风格' },
  { value: '水彩风格', label: '水彩风格' },
  { value: '油画风格', label: '油画风格' },
  { value: '赛博朋克', label: '赛博朋克' },
  { value: '蒸汽朋克', label: '蒸汽朋克' }
];

const SceneImageModal: React.FC<SceneImageModalProps> = ({
  isOpen,
  onClose,
  scene,
  isGenerating,
  onGenerate
}) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('写实风格');

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

  const handleGenerate = () => {
    if (scene && selectedModel) {
      onGenerate(scene.id, selectedStyle, selectedModel);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
      <ModalContent className="bg-white">
        {(onCloseModal) => (
          <>
            <ModalHeader className="text-slate-800 font-bold">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-600" />
                场景图片生成 - {scene?.name}
              </div>
            </ModalHeader>
            <ModalBody>
              {/* 已生成的图片 */}
              {scene?.image_url && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">当前场景图片</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={scene.image_url} 
                      alt={scene.name} 
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* 场景信息预览 */}
              <div className="mb-6 bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">场景信息</h3>
                <div className="space-y-2 text-sm">
                  {scene?.description && (
                    <div>
                      <span className="font-medium text-slate-600">描述：</span>
                      <span className="text-slate-700">{scene.description}</span>
                    </div>
                  )}
                  {scene?.environment && (
                    <div>
                      <span className="font-medium text-slate-600">环境：</span>
                      <span className="text-slate-700">{scene.environment}</span>
                    </div>
                  )}
                  {scene?.lighting && (
                    <div>
                      <span className="font-medium text-slate-600">光照：</span>
                      <span className="text-slate-700">{scene.lighting}</span>
                    </div>
                  )}
                  {scene?.mood && (
                    <div>
                      <span className="font-medium text-slate-600">氛围：</span>
                      <span className="text-slate-700">{scene.mood}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 风格选择 */}
              <div className="mb-4">
                <Select
                  label="图片风格"
                  placeholder="选择图片风格"
                  selectedKeys={[selectedStyle]}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  isDisabled={isGenerating}
                  className="mb-4"
                >
                  {STYLE_OPTIONS.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* AI 模型选择器 */}
              <div className="mb-4">
                <AIModelSelector
                  label="图片生成模型"
                  description="选择用于生成场景图片的 AI 模型"
                  models={models}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  filterType="IMAGE"
                  size="md"
                  isDisabled={isGenerating}
                />
              </div>

              {/* 生成状态 */}
              {isGenerating && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-green-600 mb-4"></div>
                    <p className="text-slate-600">正在生成场景图片...</p>
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
                className="bg-green-600 text-white font-semibold"
                startContent={<Wand2 className="w-4 h-4" />}
                onPress={handleGenerate}
                isLoading={isGenerating}
                isDisabled={!selectedModel || !scene || isGenerating}
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
