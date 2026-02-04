import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Textarea, Select, SelectItem, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { Sparkles, Video, Zap, TrendingDown, Wallet } from 'lucide-react';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('电影感');
  const [length, setLength] = useState('短篇');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(100);
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    fetchVideoModels();
    fetchUserBalance();
  }, []);

  const fetchVideoModels = async () => {
    try {
      const res = await fetch('/api/videos/models');
      if (res.ok) {
        const data = await res.json();
        setVideoModels(data.models || []);
        if (data.models.length > 0) {
          setSelectedModel(data.models[1]?.id || data.models[0]?.id); // 默认选择"性能"档
        }
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const res = await fetch('/api/users/profile');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  };

  const handleGenerate = async () => {
    if (!description && !title) {
      alert('请至少填写标题或故事概述');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setBalance(data.balance);
      alert(`剧本生成成功！消费: ¥${data.billing.amount.toFixed(4)}`);
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

    const estimatedCost = 10 * model.pricing.perSecond;
    
    if (balance < estimatedCost) {
      alert(`余额不足！预计需要: ¥${estimatedCost.toFixed(2)}`);
      return;
    }

    try {
      const res = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: 1,
          modelTier: selectedModel,
          duration: 10
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      setBalance(data.balance);
      alert(`视频生成成功！消费: ¥${data.cost.toFixed(2)}\n视频URL: ${data.videoUrl}`);
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
      case '极致': return 'from-purple-600 to-pink-600';
      case '性能': return 'from-blue-600 to-cyan-600';
      case '经济': return 'from-green-600 to-teal-600';
      default: return 'from-gray-600 to-slate-600';
    }
  };

  return (
    <div className="h-full bg-black overflow-hidden">
      <div className="h-full flex">
        {/* 左侧：创作区 */}
        <div className="w-1/2 border-r border-white/10 flex flex-col">
          <div className="p-8 space-y-6 overflow-auto">
            {/* 余额显示 */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">创作工作台</h1>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-white/60">余额</span>
                <span className="text-lg font-bold text-white">¥{balance.toFixed(2)}</span>
              </div>
            </div>

            {/* 输入表单 */}
            <Card className="bg-white/5 border-white/10 shadow-none">
              <CardBody className="p-6 space-y-4">
                <Input
                  label="剧本标题"
                  placeholder="输入你的创意标题"
                  value={title}
                  onValueChange={setTitle}
                  classNames={{
                    input: "bg-transparent text-white font-semibold placeholder-white/70",
                    label: "text-white/80 font-medium",
                    inputWrapper: "bg-white/5 border-white/10"
                  }}
                />

                <Textarea
                  label="故事概述"
                  placeholder="描述你的故事创意..."
                  value={description}
                  onValueChange={setDescription}
                  minRows={4}
                  classNames={{
                    input: "bg-transparent text-white font-medium placeholder-white/70",
                    label: "text-white/80 font-medium",
                    inputWrapper: "bg-white/5 border-white/10"
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="风格"
                    selectedKeys={[style]}
                    onChange={(e) => setStyle(e.target.value)}
                    classNames={{
                      trigger: "bg-white/10 border-white/20 text-black font-bold",
                      label: "text-white/80",
                      value: "text-black font-bold text-lg",
                      selectorIcon: "text-black"
                    }}
                  >
                    <SelectItem 
                      key="电影感" 
                      value="电影感"
                      className="text-white hover:bg-white/10"
                    >
                      电影感
                    </SelectItem>
                    <SelectItem 
                      key="科幻" 
                      value="科幻"
                      className="text-white hover:bg-white/10"
                    >
                      科幻
                    </SelectItem>
                    <SelectItem 
                      key="悬疑" 
                      value="悬疑"
                      className="text-white hover:bg-white/10"
                    >
                      悬疑
                    </SelectItem>
                    <SelectItem 
                      key="治愈" 
                      value="治愈"
                      className="text-white hover:bg-white/10"
                    >
                      治愈
                    </SelectItem>
                  </Select>

                  <Select
                    label="长度"
                    selectedKeys={[length]}
                    onChange={(e) => setLength(e.target.value)}
                    classNames={{
                      trigger: "bg-white/10 border-white/20 text-black font-bold",
                      label: "text-white/80",
                      value: "text-black font-bold text-lg",
                      selectorIcon: "text-black"
                    }}
                  >
                    <SelectItem 
                      key="短篇" 
                      value="短篇"
                      className="text-white hover:bg-white/10"
                    >
                      短篇 (1-3分钟)
                    </SelectItem>
                    <SelectItem 
                      key="中篇" 
                      value="中篇"
                      className="text-white hover:bg-white/10"
                    >
                      中篇 (3-5分钟)
                    </SelectItem>
                    <SelectItem 
                      key="长篇" 
                      value="长篇"
                      className="text-white hover:bg-white/10"
                    >
                      长篇 (5-10分钟)
                    </SelectItem>
                  </Select>
                </div>

                <Button
                  className="w-full bg-white text-black hover:bg-white/90 font-bold"
                  size="lg"
                  startContent={<Sparkles className="w-5 h-5" />}
                  isLoading={loading}
                  onPress={handleGenerate}
                >
                  {loading ? '生成中...' : '生成剧本'}
                </Button>
              </CardBody>
            </Card>

            {/* 模型选择提示 */}
            {content && (
              <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-purple-400" />
                      <span className="text-white/80 font-medium">剧本已生成，可以开始制作视频</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold"
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
        <div className="flex-1 flex flex-col bg-gradient-to-br from-black via-slate-950 to-black">
          <div className="p-8 overflow-auto">
            {content ? (
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-white/90 font-medium leading-relaxed text-base">
                  {content}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto bg-white/5 rounded-full flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-white/20" />
                  </div>
                  <p className="text-white/50 text-lg font-semibold">开始创作你的视频剧本</p>
                  <p className="text-white/30 text-sm font-medium">输入创意 → 生成剧本 → 选择模型 → 生成视频</p>
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
          base: "bg-slate-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-white font-bold">选择视频生成模型</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-2 gap-4">
                  {videoModels.map((model) => (
                    <Card
                      key={model.id}
                      isPressable
                      isHoverable
                      className={`cursor-pointer transition-all ${
                        selectedModel === model.id
                          ? 'bg-gradient-to-br ' + getTierColor(model.tier) + ' border-white/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      onPress={() => setSelectedModel(model.id)}
                    >
                      <CardBody className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTierIcon(model.tier)}
                            <span className="font-bold text-white">{model.tier}</span>
                          </div>
                          <Chip size="sm" variant="flat" className="bg-white/20 text-white font-semibold">
                            {model.displayName}
                          </Chip>
                        </div>
                        
                        <p className="text-sm text-white/80 font-medium">{model.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          {model.features.map((feature, idx) => (
                            <Chip key={idx} size="sm" variant="flat" className="bg-white/10 text-white/70 font-medium">
                              {feature}
                            </Chip>
                          ))}
                        </div>
                        
                        <div className="pt-2 border-t border-white/10">
                          <div className="text-xs text-white/60 font-medium">预计费用 (10秒)</div>
                          <div className="text-lg font-bold text-white">
                            ¥{(10 * model.pricing.perSecond).toFixed(2)}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="text-white/70 font-semibold">
                  取消
                </Button>
                <Button 
                  className="bg-white text-black font-bold"
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
