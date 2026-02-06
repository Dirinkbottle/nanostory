import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Plus, Image, Eye } from 'lucide-react';
import { ResourceItem } from './types';

interface PropsTabProps {
  props: string[];
  onPreview: (resource: ResourceItem) => void;
}

const PropsTab: React.FC<PropsTabProps> = ({ props, onPreview }) => {
  return (
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
                onPress={() => onPreview({ name: prop })}
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

export default PropsTab;
