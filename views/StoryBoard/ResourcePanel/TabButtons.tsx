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
        className={activeTab === 'characters' ? 'bg-blue-600 text-white' : ''}
        onPress={() => onTabChange('characters')}
      >
        角色
      </Button>
      <Button
        size="sm"
        variant={activeTab === 'locations' ? 'solid' : 'flat'}
        className={activeTab === 'locations' ? 'bg-blue-600 text-white' : ''}
        onPress={() => onTabChange('locations')}
      >
        场景
      </Button>
      <Button
        size="sm"
        variant={activeTab === 'props' ? 'solid' : 'flat'}
        className={activeTab === 'props' ? 'bg-blue-600 text-white' : ''}
        onPress={() => onTabChange('props')}
      >
        道具
      </Button>
    </div>
  );
};

export default TabButtons;
