import React from 'react';
import { Button } from '@heroui/react';
import { TabType } from './types';

interface TabButtonsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabButtons: React.FC<TabButtonsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={activeTab === 'characters' ? 'solid' : 'flat'}
        className={activeTab === 'characters' ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white' : 'bg-slate-800/60 text-slate-400'}
        onPress={() => onTabChange('characters')}
      >
        角色
      </Button>
      <Button
        size="sm"
        variant={activeTab === 'locations' ? 'solid' : 'flat'}
        className={activeTab === 'locations' ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white' : 'bg-slate-800/60 text-slate-400'}
        onPress={() => onTabChange('locations')}
      >
        场景
      </Button>
      <Button
        size="sm"
        variant={activeTab === 'props' ? 'solid' : 'flat'}
        className={activeTab === 'props' ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white' : 'bg-slate-800/60 text-slate-400'}
        onPress={() => onTabChange('props')}
      >
        道具
      </Button>
    </div>
  );
};

export default TabButtons;
