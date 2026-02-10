import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Plus, Image, Eye } from 'lucide-react';
import { ResourceItem } from './types';

interface LocationsTabProps {
  locations: string[];
  onPreview: (resource: ResourceItem) => void;
  onGenerateImage: (sceneName: string) => void;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ locations, onPreview, onGenerateImage }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-300">全部场景 ({locations.length})</span>
        <Button size="sm" variant="light" className="text-slate-400" startContent={<Plus className="w-3 h-3" />}>
          添加
        </Button>
      </div>
      {locations.map((loc, idx) => (
        <Card key={idx} className="bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/30 transition-colors cursor-pointer">
          <CardBody className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <span className="text-lg">📍</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100">{loc}</p>
                <p className="text-xs text-slate-500">点击生成场景图</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-2 border-t border-slate-700/30">
              <Button
                size="sm"
                variant="flat"
                className="flex-1 bg-purple-500/10 text-purple-400 text-xs font-medium"
                startContent={<Image className="w-3 h-3" />}
                onPress={() => onGenerateImage(loc)}
              >
                生成图
              </Button>
              <Button
                size="sm"
                variant="flat"
                className="flex-1 bg-blue-500/10 text-blue-400 text-xs font-medium"
                startContent={<Eye className="w-3 h-3" />}
                onPress={() => onPreview({ name: loc })}
              >
                预览
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default LocationsTab;
