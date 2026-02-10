import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody, Chip } from '@heroui/react';
import { Sparkles, Video, Zap, TrendingDown } from 'lucide-react';

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

interface VideoModelSelectorProps {
  isOpen: boolean;
  videoModels: VideoModel[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const VideoModelSelector: React.FC<VideoModelSelectorProps> = ({
  isOpen,
  videoModels,
  selectedModel,
  onModelSelect,
  onConfirm,
  onClose
}) => {
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
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getTierBorderColor = (tier: string) => {
    switch (tier) {
      case '极致': return 'border-purple-500/50';
      case '性能': return 'border-blue-500/50';
      case '经济': return 'border-green-500/50';
      default: return 'border-slate-600/50';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onClose}
      size="3xl"
      classNames={{
        base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/40",
        header: "border-b border-slate-700/50",
        body: "py-6",
        footer: "border-t border-slate-700/50"
      }}
    >
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="text-slate-100 font-bold">选择视频生成模型</ModalHeader>
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
                        : 'bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10'
                    }`}
                    onPress={() => onModelSelect(model.id)}
                  >
                    <CardBody className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTierIcon(model.tier)}
                          <span className={`font-bold ${selectedModel === model.id ? 'text-white' : 'text-slate-100'}`}>
                            {model.tier}
                          </span>
                        </div>
                        <Chip 
                          size="sm" 
                          variant="flat" 
                          className={selectedModel === model.id ? 'bg-white/20 text-white font-semibold' : 'bg-slate-700/50 text-slate-300 font-semibold'}
                        >
                          {model.displayName}
                        </Chip>
                      </div>
                      
                      <p className={`text-sm font-medium ${selectedModel === model.id ? 'text-white/90' : 'text-slate-400'}`}>
                        {model.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {model.features.map((feature, idx) => (
                          <Chip 
                            key={idx} 
                            size="sm" 
                            variant="flat" 
                            className={selectedModel === model.id ? 'bg-white/20 text-white/90 font-medium' : 'bg-slate-700/50 text-slate-400 font-medium'}
                          >
                            {feature}
                          </Chip>
                        ))}
                      </div>
                      
                      <div className={`pt-2 border-t ${selectedModel === model.id ? 'border-white/20' : 'border-slate-700/50'}`}>
                        <div className={`text-xs font-medium ${selectedModel === model.id ? 'text-white/70' : 'text-slate-500'}`}>
                          预计费用 (10秒)
                        </div>
                        <div className={`text-lg font-bold ${selectedModel === model.id ? 'text-white' : 'text-slate-100'}`}>
                          ¥{(10 * model.pricing.perSecond).toFixed(2)}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onModalClose} className="text-slate-400 font-semibold hover:bg-slate-800/60">
                取消
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold shadow-lg shadow-blue-500/20"
                onPress={onConfirm}
              >
                确认生成
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default VideoModelSelector;
