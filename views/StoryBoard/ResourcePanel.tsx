import React, { useState } from 'react';
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { Plus, Wand2, Image, Save, Eye, Layers } from 'lucide-react';
import { getAuthToken } from '../../services/auth';

interface ResourceItem {
  name: string;
  count?: number;
  imageUrl?: string;
  frontViewUrl?: string;
  sideViewUrl?: string;
  backViewUrl?: string;
}

interface ResourcePanelProps {
  characters: string[];
  locations: string[];
  props: string[];
  projectId?: number;
  scriptId?: number;
  scenes?: any[];
  onExtractResources?: () => void;
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  characters, 
  locations, 
  props,
  projectId,
  scriptId,
  scenes,
  onExtractResources
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'props'>('characters');
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState<any>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onOpenChange: onPreviewChange } = useDisclosure();

  // 提取资源到资源库
  const handleExtractResources = async () => {
    if (!projectId || !scenes || scenes.length === 0) {
      alert('没有可提取的资源');
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch('/api/characters/extract-from-storyboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          projectId,
          scriptId,
          scenes
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`资源提取成功！新增：${data.stats.characters} 个角色，${data.stats.scenes} 个场景，${data.stats.props} 个道具`);
        if (onExtractResources) onExtractResources();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      alert('提取失败: ' + error.message);
    }
  };

  // 生成角色三视图
  const handleGenerateViews = async (charName: string) => {
    setSelectedResource({ name: charName });
    setIsGenerating(true);
    setGeneratedPrompts(null);
    onOpen();

    try {
      // 这里需要先获取角色ID，暂时用名称查询
      // 实际应用中应该传入完整的角色对象
      const token = getAuthToken();
      
      // 模拟生成提示词
      const mockPrompts = {
        front: `${charName}, front view, full body, anime style, white background, character design sheet, high quality, detailed`,
        side: `${charName}, side view, full body, anime style, white background, character design sheet, high quality, detailed`,
        back: `${charName}, back view, full body, anime style, white background, character design sheet, high quality, detailed`,
        characterSheet: `${charName}, character turnaround sheet, front side back views, anime style, white background, professional character design, high quality`
      };

      setGeneratedPrompts(mockPrompts);
    } catch (error: any) {
      alert('生成失败: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 预览资源
  const handlePreview = (resource: ResourceItem) => {
    setSelectedResource(resource);
    onPreviewOpen();
  };

  return (
    <div className="w-80 flex flex-col bg-white border-l border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">资源库</h3>
          <Button
            size="sm"
            variant="flat"
            className="bg-green-100 text-green-700 font-medium"
            startContent={<Save className="w-3 h-3" />}
            onPress={handleExtractResources}
          >
            同步资源
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === 'characters' ? 'solid' : 'flat'}
            className={activeTab === 'characters' ? 'bg-blue-600 text-white' : ''}
            onPress={() => setActiveTab('characters')}
          >
            角色
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'locations' ? 'solid' : 'flat'}
            className={activeTab === 'locations' ? 'bg-blue-600 text-white' : ''}
            onPress={() => setActiveTab('locations')}
          >
            场景
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'props' ? 'solid' : 'flat'}
            className={activeTab === 'props' ? 'bg-blue-600 text-white' : ''}
            onPress={() => setActiveTab('props')}
          >
            道具
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'characters' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">全部角色 ({characters.length})</span>
              <Button size="sm" variant="light" startContent={<Plus className="w-3 h-3" />}>
                添加
              </Button>
            </div>
            {characters.map((char, idx) => (
              <Card key={idx} className="border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{char}</p>
                      <p className="text-xs text-slate-500">点击生成三视图</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="flat"
                      className="flex-1 bg-purple-100 text-purple-700 text-xs font-medium"
                      startContent={<Layers className="w-3 h-3" />}
                      onPress={() => handleGenerateViews(char)}
                    >
                      三视图
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="flex-1 bg-blue-100 text-blue-700 text-xs font-medium"
                      startContent={<Eye className="w-3 h-3" />}
                      onPress={() => handlePreview({ name: char })}
                    >
                      预览
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'locations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">全部场景 ({locations.length})</span>
              <Button size="sm" variant="light" startContent={<Plus className="w-3 h-3" />}>
                添加
              </Button>
            </div>
            {locations.map((loc, idx) => (
              <Card key={idx} className="border border-slate-200 hover:border-purple-300 transition-colors cursor-pointer">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-purple-100 flex items-center justify-center">
                      <span className="text-lg">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{loc}</p>
                      <p className="text-xs text-slate-500">点击生成场景图</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="flat"
                      className="flex-1 bg-purple-100 text-purple-700 text-xs font-medium"
                      startContent={<Image className="w-3 h-3" />}
                    >
                      生成图
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="flex-1 bg-blue-100 text-blue-700 text-xs font-medium"
                      startContent={<Eye className="w-3 h-3" />}
                      onPress={() => handlePreview({ name: loc })}
                    >
                      预览
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'props' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">全部道具 ({props.length})</span>
              <Button size="sm" variant="light" startContent={<Plus className="w-3 h-3" />}>
                添加
              </Button>
            </div>
            {props.map((prop, idx) => (
              <Card key={idx} className="border border-slate-200 hover:border-green-300 transition-colors cursor-pointer">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-green-100 flex items-center justify-center">
                      <span className="text-lg">🎬</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{prop}</p>
                      <p className="text-xs text-slate-500">点击生成道具图</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="flat"
                      className="flex-1 bg-green-100 text-green-700 text-xs font-medium"
                      startContent={<Image className="w-3 h-3" />}
                    >
                      生成图
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="flex-1 bg-blue-100 text-blue-700 text-xs font-medium"
                      startContent={<Eye className="w-3 h-3" />}
                      onPress={() => handlePreview({ name: prop })}
                    >
                      预览
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 三视图生成弹窗 */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent className="bg-white">
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-800 font-bold">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  角色三视图 - {selectedResource?.name}
                </div>
              </ModalHeader>
              <ModalBody>
                {isGenerating ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-4 border-purple-600 mb-4"></div>
                      <p className="text-slate-600">正在生成三视图提示词...</p>
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
                <Button variant="light" onPress={onClose}>关闭</Button>
                <Button 
                  className="bg-purple-600 text-white font-semibold"
                  startContent={<Wand2 className="w-4 h-4" />}
                  onPress={() => handleGenerateViews(selectedResource?.name || '')}
                  isLoading={isGenerating}
                >
                  重新生成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 资源预览弹窗 */}
      <Modal isOpen={isPreviewOpen} onOpenChange={onPreviewChange} size="lg">
        <ModalContent className="bg-white">
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-800 font-bold">
                预览 - {selectedResource?.name}
              </ModalHeader>
              <ModalBody>
                <div className="flex items-center justify-center py-8">
                  <div className="w-64 h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                    {selectedResource?.imageUrl ? (
                      <img src={selectedResource.imageUrl} alt={selectedResource.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <span className="text-6xl block mb-2">🖼️</span>
                        <p className="text-sm">暂无原画</p>
                        <p className="text-xs mt-1">点击生成按钮创建</p>
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>关闭</Button>
                <Button 
                  className="bg-blue-600 text-white font-semibold"
                  startContent={<Wand2 className="w-4 h-4" />}
                >
                  生成原画
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ResourcePanel;
