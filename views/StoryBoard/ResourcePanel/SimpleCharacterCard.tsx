import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Layers, Eye } from 'lucide-react';
import { ResourceItem } from './types';

interface SimpleCharacterCardProps {
  name: string;
  scenes?: any[];
  onGenerateViews: (charName: string) => void;
  onPreview: (resource: ResourceItem) => void;
}

const SimpleCharacterCard: React.FC<SimpleCharacterCardProps> = ({
  name,
  scenes,
  onGenerateViews,
  onPreview
}) => {
  return (
    <Card className="bg-slate-50 shadow-sm hover:shadow-md transition-shadow">
      <CardBody className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-slate-800">{name}</h4>
          <span className="text-xs text-slate-500">
            出现 {scenes?.filter(s => s.characters?.includes(name)).length || 0} 次
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            className="flex-1 bg-purple-100 text-purple-700 text-xs font-medium"
            startContent={<Layers className="w-3 h-3" />}
            onPress={() => onGenerateViews(name)}
          >
            三视图
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="flex-1 bg-blue-100 text-blue-700 text-xs font-medium"
            startContent={<Eye className="w-3 h-3" />}
            onPress={() => onPreview({ name })}
          >
            预览
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default SimpleCharacterCard;
