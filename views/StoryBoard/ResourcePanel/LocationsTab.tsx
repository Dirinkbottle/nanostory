import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Plus, Image, Eye, Loader2 } from 'lucide-react';
import { ResourceItem } from './types';
import { Scene } from './useSceneData';

interface LocationsTabProps {
  scenes: Scene[];
  activeSceneIds: string[];
  onPreview: (resource: ResourceItem) => void;
  onGenerateImage: (scene: Scene) => void;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ scenes, activeSceneIds, onPreview, onGenerateImage }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-300">全部场景 ({scenes.length})</span>
        <Button size="sm" variant="light" className="text-slate-400" startContent={<Plus className="w-3 h-3" />}>
          添加
        </Button>
      </div>
      {scenes.map((scene) => {
        const isGenerating = activeSceneIds.includes(String(scene.id));
        return (
        <Card key={scene.id} className="bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/30 transition-colors cursor-pointer">
          <CardBody className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <span className="text-lg">📍</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100">{scene.name}</p>
                <p className="text-xs text-slate-500">{isGenerating ? '场景图生成中...' : '点击生成场景图'}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-2 border-t border-slate-700/30">
              <Button
                size="sm"
                variant="flat"
                className="flex-1 bg-purple-500/10 text-purple-400 text-xs font-medium"
                startContent={isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                onPress={() => onGenerateImage(scene)}
                isDisabled={isGenerating}
              >
                {isGenerating ? '生成中...' : '生成图'}
              </Button>
              <Button
                size="sm"
                variant="flat"
                className="flex-1 bg-blue-500/10 text-blue-400 text-xs font-medium"
                startContent={<Eye className="w-3 h-3" />}
                onPress={() => onPreview({ name: scene.name })}
              >
                预览
              </Button>
            </div>
          </CardBody>
        </Card>
      )})}
    </div>
  );
};

export default LocationsTab;
