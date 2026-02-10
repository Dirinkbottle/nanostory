import React from 'react';
import { Select, SelectItem } from '@heroui/react';

export interface AIModel {
  id?: number;
  name: string;
  provider: string;
  type: string;
  category?: string;
  description?: string;
  isActive?: boolean;
}

interface AIModelSelectorProps {
  label?: string;
  description?: string;
  placeholder?: string;
  models: AIModel[];
  selectedModel: string;
  onModelChange: (modelName: string) => void;
  filterType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isRequired?: boolean;
  className?: string;
}

const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  label = 'AI 模型',
  description,
  placeholder = '请选择模型',
  models,
  selectedModel,
  onModelChange,
  filterType,
  size = 'md',
  isDisabled = false,
  isRequired = false,
  className = ''
}) => {
  // 根据类型过滤模型 - 使用 category 字段（后端返回的字段名）
  const filteredModels = filterType
    ? models.filter(m => {
        const modelType = (m.type || m.category)?.toUpperCase();
        return modelType === filterType.toUpperCase();
      })
    : models;

  // 获取选中模型的详细信息
  const selectedModelInfo = filteredModels.find(m => m.name === selectedModel);

  // 动态生成描述
  const dynamicDescription = description || (
    selectedModelInfo
      ? `${selectedModelInfo.provider} - ${selectedModelInfo.description || '暂无描述'}`
      : placeholder
  );

  return (
    <Select
      label={label}
      placeholder={placeholder}
      selectedKeys={selectedModel ? [selectedModel] : []}
      onChange={(e) => onModelChange(e.target.value)}
      size={size as "sm" | "md" | "lg"}
      isDisabled={isDisabled}
      isRequired={isRequired}
      description={dynamicDescription}
      classNames={{
        trigger: `bg-slate-800/60 border border-slate-600/50 text-slate-100 font-semibold hover:border-blue-500/50 shadow-sm ${className}`,
        label: "text-slate-400 font-medium",
        value: "text-slate-100 font-semibold",
        selectorIcon: "text-slate-400"
      }}
      popoverProps={{
        classNames: {
          content: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-lg"
        }
      }}
    >
      {filteredModels.map((model) => (
        <SelectItem 
          key={model.name} 
          className="text-slate-200 hover:bg-slate-800/80 data-[hover=true]:bg-slate-800/80"
          textValue={model.name}
        >
          <div className="flex flex-col py-1">
            <span className="font-semibold text-slate-100">{model.name}</span>
            <span className="text-xs text-slate-400">
              {model.provider} {model.description && `· ${model.description}`}
            </span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
};

export default AIModelSelector;
