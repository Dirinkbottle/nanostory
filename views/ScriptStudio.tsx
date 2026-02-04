import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Textarea, Select, SelectItem, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tabs, Tab } from '@heroui/react';
import { Sparkles, Video, Zap, TrendingDown, FileText, BookOpen } from 'lucide-react';
import { getAuthToken } from '../services/auth';

interface VideoModel {
  id: string;
  displayName: string;
  tier: string;
  description: string;
  pricing: {
    perSecond: number;
  };
  features: string[];
}

const ScriptStudio: React.FC = () => {
  const [creationType, setCreationType] = useState<'script' | 'comic'>('script');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('电影感');
  const [length, setLength] = useState('短篇');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    fetchVideoModels();
  }, []);

  const fetchVideoModels = async () => {
    try {
      const res = await fetch('/api/videos/models');
      if (res.ok) {
        const data = await res.json();
        setVideoModels(data.models || []);
        if (data.models.length > 0) {
          setSelectedModel(data.models[1]?.id || data.models[0]?.id);
        }
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const handleGenerate = async () => {
    if (!description && !title) {
      alert('请至少填写标题或故事概述');
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title, description, style, length })
      });

      const data = await res.json();

      if (res.status === 402) {
        alert(`余额不足！需要: ¥${data.required.toFixed(4)}, 当前: ¥${data.current.toFixed(2)}`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      setContent(data.content);
      alert(`生成成功！`);
    } catch (error: any) {
      alert(error.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = () => {
    if (!content) {
      alert('请先生成剧本');
      return;
    }
    onOpen();
  };

  const confirmGenerateVideo = async () => {
    if (!selectedModel) {
      alert('请选择视频模型');
      return;
    }

    const model = videoModels.find(m => m.id === selectedModel);
    if (!model) return;

    try {
      const token = getAuthToken();
      const res = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          scriptId: 1,
          modelTier: selectedModel,
          duration: 10
        })
      });

      const data = await res.json();

      if (res.status === 402) {
        alert(`余额不足！`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      alert(`视频生成成功！\n视频URL: ${data.videoUrl}`);
      onOpenChange();
    } catch (error: any) {
      alert(error.message || '生成失败');
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case '极致': return <Sparkles className="w-4 h-4" />;
      case '性能': return <Zap className="w-4 h-4" />;
      case '经济': return <TrendingDown className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case '极致': return 'from-purple-500 to-pink-500';
      case '性能': return 'from-blue-500 to-cyan-500';
      case '经济': return 'from-green-500 to-teal-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getTierBorderColor = (tier: string) => {
    switch (tier) {
      case '极致': return 'border-purple-300';
      case '性能': return 'border-blue-300';
      case '经济': return 'border-green-300';
      default: return 'border-slate-300';
    }
  };

  return (
    <div className="h-full bg-slate-50 overflow-hidden">
      <div className="h-full flex">
        {/* 左侧：创作区 */}
        <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-8 space-y-6 overflow-auto">
            {/* 标题 */}
            <div className="mb-6">
              <h1 className="text-3xl font-black tracking-wide text-slate-800">
                创作工作台
              </h1>
            </div>

            {/* 输入表单 */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardBody className="p-6 space-y-5">
                <div className="mb-1">
                  <h2 className="text-lg font-bold text-slate-800 mb-1">创作你的故事</h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                </div>

                {/* 创作类型选择 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCreationType('script')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                      creationType === 'script'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="font-bold">剧本生成</span>
                  </button>
                  <button
                    onClick={() => setCreationType('comic')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                      creationType === 'comic'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="font-bold">漫剧生成</span>
                  </button>
                </div>

                <Input
                  label="剧本标题"
                  placeholder="输入你的创意标题"
                  value={title}
                  onValueChange={setTitle}
                  classNames={{
                    input: "bg-white text-slate-800 font-semibold placeholder:text-slate-400",
                    label: "text-slate-600 font-medium",
                    inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-blue-500 shadow-sm"
                  }}
                />

                <Textarea
                  label="故事概述"
                  placeholder="描述你的故事创意..."
                  value={description}
                  onValueChange={setDescription}
                  minRows={4}
                  classNames={{
                    input: "bg-white text-slate-800 font-medium placeholder:text-slate-400",
                    label: "text-slate-600 font-medium",
                    inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-blue-500 shadow-sm"
                  }}
                />

                <div className="grid grid-cols-2 gap-5 pt-2">
                  <Select
                    label="风格"
                    selectedKeys={[style]}
                    onChange={(e) => setStyle(e.target.value)}
                    classNames={{
                      trigger: "bg-white border border-slate-200 text-slate-800 font-semibold hover:border-blue-300 shadow-sm",
                      label: "text-slate-600 font-medium",
                      value: "text-slate-800 font-semibold",
                      selectorIcon: "text-slate-500"
                    }}
                    popoverProps={{
                      classNames: {
                        content: "bg-white border border-slate-200 shadow-lg"
                      }
                    }}
                  >
                    <SelectItem key="电影感" value="电影感" className="text-slate-800 hover:bg-slate-100">电影感</SelectItem>
                    <SelectItem key="科幻" value="科幻" className="text-slate-800 hover:bg-slate-100">科幻</SelectItem>
                    <SelectItem key="悬疑" value="悬疑" className="text-slate-800 hover:bg-slate-100">悬疑</SelectItem>
                    <SelectItem key="治愈" value="治愈" className="text-slate-800 hover:bg-slate-100">治愈</SelectItem>
                  </Select>

                  <Select
                    label="长度"
                    selectedKeys={[length]}
                    onChange={(e) => setLength(e.target.value)}
                    classNames={{
                      trigger: "bg-white border border-slate-200 text-slate-800 font-semibold hover:border-blue-300 shadow-sm",
                      label: "text-slate-600 font-medium",
                      value: "text-slate-800 font-semibold",
                      selectorIcon: "text-slate-500"
                    }}
                    popoverProps={{
                      classNames: {
                        content: "bg-white border border-slate-200 shadow-lg"
                      }
                    }}
                  >
                    <SelectItem key="短篇" value="短篇" className="text-slate-800 hover:bg-slate-100">短篇 (1-3分钟)</SelectItem>
                    <SelectItem key="中篇" value="中篇" className="text-slate-800 hover:bg-slate-100">中篇 (3-5分钟)</SelectItem>
                    <SelectItem key="长篇" value="长篇" className="text-slate-800 hover:bg-slate-100">长篇 (5-10分钟)</SelectItem>
                  </Select>
                </div>

                <Button
                  className={`w-full text-white font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 ${
                    creationType === 'script'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/25'
                  }`}
                  size="lg"
                  startContent={creationType === 'script' ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  isLoading={loading}
                  onPress={handleGenerate}
                >
                  {loading ? '生成中...' : creationType === 'script' ? '生成剧本' : '生成漫剧'}
                </Button>
              </CardBody>
            </Card>

            {/* 模型选择提示 */}
            {content && (
              <Card className="bg-blue-50 border border-blue-200">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-slate-700 font-medium">剧本已生成，可以开始制作视频</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 text-white font-bold hover:bg-blue-700"
                      onPress={handleGenerateVideo}
                    >
                      选择模型
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>

        {/* 右侧：预览区 */}
        <div className="flex-1 flex flex-col bg-slate-50">
          <div className="p-8 overflow-auto">
            {content ? (
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardBody className="p-6">
                  <pre className="whitespace-pre-wrap text-slate-700 font-medium leading-relaxed text-base">
                    {content}
                  </pre>
                </CardBody>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-slate-300" />
                  </div>
                  <p className="text-slate-500 text-lg font-semibold">开始创作你的视频剧本</p>
                  <p className="text-slate-400 text-sm font-medium">输入创意 → 生成剧本 → 选择模型 → 生成视频</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 视频模型选择对话框 */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="3xl"
        classNames={{
          base: "bg-white border border-slate-200 shadow-xl",
          header: "border-b border-slate-200",
          body: "py-6",
          footer: "border-t border-slate-200"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-800 font-bold">选择视频生成模型</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-2 gap-4">
                  {videoModels.map((model) => (
                    <Card
                      key={model.id}
                      isPressable
                      isHoverable
                      className={`cursor-pointer transition-all ${
                        selectedModel === model.id
                          ? 'bg-gradient-to-br ' + getTierColor(model.tier) + ' text-white ' + getTierBorderColor(model.tier) + ' border-2'
                          : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                      onPress={() => setSelectedModel(model.id)}
                    >
                      <CardBody className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTierIcon(model.tier)}
                            <span className={`font-bold ${selectedModel === model.id ? 'text-white' : 'text-slate-800'}`}>
                              {model.tier}
                            </span>
                          </div>
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            className={selectedModel === model.id ? 'bg-white/20 text-white font-semibold' : 'bg-slate-100 text-slate-700 font-semibold'}
                          >
                            {model.displayName}
                          </Chip>
                        </div>
                        
                        <p className={`text-sm font-medium ${selectedModel === model.id ? 'text-white/90' : 'text-slate-600'}`}>
                          {model.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {model.features.map((feature, idx) => (
                            <Chip 
                              key={idx} 
                              size="sm" 
                              variant="flat" 
                              className={selectedModel === model.id ? 'bg-white/20 text-white/90 font-medium' : 'bg-slate-100 text-slate-600 font-medium'}
                            >
                              {feature}
                            </Chip>
                          ))}
                        </div>
                        
                        <div className={`pt-2 border-t ${selectedModel === model.id ? 'border-white/20' : 'border-slate-200'}`}>
                          <div className={`text-xs font-medium ${selectedModel === model.id ? 'text-white/70' : 'text-slate-500'}`}>
                            预计费用 (10秒)
                          </div>
                          <div className={`text-lg font-bold ${selectedModel === model.id ? 'text-white' : 'text-slate-800'}`}>
                            ¥{(10 * model.pricing.perSecond).toFixed(2)}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="text-slate-600 font-semibold hover:bg-slate-100">
                  取消
                </Button>
                <Button 
                  className="bg-blue-600 text-white font-bold hover:bg-blue-700"
                  onPress={confirmGenerateVideo}
                >
                  确认生成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ScriptStudio;
