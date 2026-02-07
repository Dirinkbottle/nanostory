import React from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import { Cpu, Edit, Trash2, Play } from 'lucide-react';
import { AIModel } from './types';

interface ModelCardProps {
  model: AIModel;
  onEdit: (model: AIModel) => void;
  onDelete: (modelId: number) => void;
  onTest: (model: AIModel) => void;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    TEXT: 'bg-blue-100 text-blue-700',
    IMAGE: 'bg-purple-100 text-purple-700',
    VIDEO: 'bg-pink-100 text-pink-700',
    AUDIO: 'bg-emerald-100 text-emerald-700'
  };
  return colors[category] || 'bg-slate-100 text-slate-700';
};

const parsePrice = (priceConfig: any) => {
  try {
    const config = typeof priceConfig === 'string' ? JSON.parse(priceConfig) : priceConfig;
    return `¥${config.price}/${config.unit}`;
  } catch {
    return '¥0.00';
  }
};

const ModelCard: React.FC<ModelCardProps> = ({ model, onEdit, onDelete, onTest }) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardBody className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Cpu className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{model.name}</h3>
              <p className="text-sm text-slate-500">{model.provider}</p>
            </div>
          </div>
          <Chip 
            size="sm" 
            className={model.is_active ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-500 font-medium'}
          >
            {model.is_active ? '启用' : '禁用'}
          </Chip>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">分类</span>
            <Chip size="sm" className={getCategoryColor(model.category)}>
              {model.category}
            </Chip>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">价格</span>
            <span className="font-medium text-slate-800">{parsePrice(model.price_config)}</span>
          </div>
          {model.custom_handler && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Handler</span>
              <Chip size="sm" className="bg-amber-100 text-amber-700">
                {model.custom_handler}
              </Chip>
            </div>
          )}
          {model.description && (
            <div className="text-xs text-slate-500 mt-2 line-clamp-2">
              {model.description}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-medium"
            startContent={<Play className="w-4 h-4" />}
            onPress={() => onTest(model)}
          >
            调试
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
            startContent={<Edit className="w-4 h-4" />}
            onPress={() => onEdit(model)}
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="bg-red-100 text-red-700 hover:bg-red-200 font-medium min-w-0 px-3"
            onPress={() => onDelete(model.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default ModelCard;
