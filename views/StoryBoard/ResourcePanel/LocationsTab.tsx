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
                onPress={() => onGenerateImage(loc)}
              >
                生成图
              </Button>
              <Button
                size="sm"
                variant="flat"
                className="flex-1 bg-blue-100 text-blue-700 text-xs font-medium"
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
