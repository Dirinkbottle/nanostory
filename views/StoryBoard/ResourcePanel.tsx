import React, { useState } from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Plus } from 'lucide-react';

interface ResourcePanelProps {
  characters: string[];
  locations: string[];
  props: string[];
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({ characters, locations, props }) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'props'>('characters');

  return (
    <div className="w-80 flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-3">资源库</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === 'characters' ? 'solid' : 'flat'}
            className={activeTab === 'characters' ? 'bg-blue-600 text-white' : ''}
            onPress={() => setActiveTab('characters')}
          >
            角色
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'locations' ? 'solid' : 'flat'}
            className={activeTab === 'locations' ? 'bg-blue-600 text-white' : ''}
            onPress={() => setActiveTab('locations')}
          >
            场景
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'props' ? 'solid' : 'flat'}
            className={activeTab === 'props' ? 'bg-blue-600 text-white' : ''}
            onPress={() => setActiveTab('props')}
          >
            道具
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'characters' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">全部角色 ({characters.length})</span>
              <Button size="sm" variant="light" startContent={<Plus className="w-3 h-3" />}>
                添加
              </Button>
            </div>
            {characters.map((char, idx) => (
              <Card key={idx} className="border border-slate-200">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{char}</p>
                      <p className="text-xs text-slate-500">出现 2 次</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'locations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">全部场景 ({locations.length})</span>
              <Button size="sm" variant="light" startContent={<Plus className="w-3 h-3" />}>
                添加
              </Button>
            </div>
            {locations.map((loc, idx) => (
              <Card key={idx} className="border border-slate-200">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-purple-100 flex items-center justify-center">
                      <span className="text-lg">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{loc}</p>
                      <p className="text-xs text-slate-500">使用 1 次</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'props' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">全部道具 ({props.length})</span>
              <Button size="sm" variant="light" startContent={<Plus className="w-3 h-3" />}>
                添加
              </Button>
            </div>
            {props.map((prop, idx) => (
              <Card key={idx} className="border border-slate-200">
                <CardBody className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-green-100 flex items-center justify-center">
                      <span className="text-lg">🎬</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{prop}</p>
                      <p className="text-xs text-slate-500">使用 1 次</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourcePanel;
