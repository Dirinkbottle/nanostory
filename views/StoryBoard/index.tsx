import React, { useState } from 'react';
import SceneList from './SceneList';
import ResourcePanel from './ResourcePanel';

interface StoryboardScene {
  id: number;
  order: number;
  description: string;
  dialogue: string;
  duration: number;
  imageUrl?: string;
  characters: string[];
  props: string[];
  location: string;
}

const StoryBoard: React.FC = () => {
  const [scenes, setScenes] = useState<StoryboardScene[]>([
    {
      id: 1,
      order: 1,
      description: '▲镜头从远处的摩天大楼群缓缓推进，阳光洒在玻璃幕墙上，反射出耀眼的光芒。镜头继续前推，最终聚焦在一栋特别高大的建筑上。',
      dialogue: '',
      duration: 5,
      characters: [],
      props: [],
      location: '城市外景'
    },
    {
      id: 2,
      order: 2,
      description: '▲镜头切换到室内，一个年轻男子坐在办公桌前，眼神专注地盯着电脑屏幕。他的手指在键盘上飞快地敲击着，周围堆满了文件和咖啡杯。',
      dialogue: '（自言自语）又是一个加班的夜晚...',
      duration: 8,
      characters: ['主角'],
      props: ['电脑', '咖啡杯', '文件'],
      location: '办公室'
    }
  ]);

  const [selectedScene, setSelectedScene] = useState<number | null>(1);

  const allCharacters = ['主角', '同事A', '老板', '路人'];
  const allLocations = ['城市外景', '办公室', '咖啡厅', '街道'];
  const allProps = ['电脑', '咖啡杯', '文件', '手机', '钥匙'];

  const handleAddScene = () => {
    const newScene: StoryboardScene = {
      id: Date.now(),
      order: scenes.length + 1,
      description: '',
      dialogue: '',
      duration: 5,
      characters: [],
      props: [],
      location: ''
    };
    setScenes([...scenes, newScene]);
  };

  const handleDeleteScene = (id: number) => {
    setScenes(scenes.filter(s => s.id !== id));
  };

  const handleMoveScene = (id: number, direction: 'up' | 'down') => {
    const index = scenes.findIndex(s => s.id === id);
    if (direction === 'up' && index > 0) {
      const newScenes = [...scenes];
      [newScenes[index], newScenes[index - 1]] = [newScenes[index - 1], newScenes[index]];
      setScenes(newScenes);
    } else if (direction === 'down' && index < scenes.length - 1) {
      const newScenes = [...scenes];
      [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
      setScenes(newScenes);
    }
  };

  const handleUpdateDescription = (id: number, description: string) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, description } : s));
  };

  const handleGenerateImage = async (id: number, prompt: string) => {
    console.log('生成图片:', id, prompt);
    // TODO: 调用后端 API 生成图片
    // 临时模拟：设置一个占位图片
    setScenes(scenes.map(s => 
      s.id === id 
        ? { ...s, imageUrl: `https://via.placeholder.com/320x192?text=Scene+${id}` } 
        : s
    ));
  };

  const handleReorderScenes = (newScenes: StoryboardScene[]) => {
    setScenes(newScenes);
  };

  return (
    <div className="h-full flex bg-slate-50">
      <SceneList
        scenes={scenes}
        selectedScene={selectedScene}
        onSelectScene={setSelectedScene}
        onMoveScene={handleMoveScene}
        onDeleteScene={handleDeleteScene}
        onAddScene={handleAddScene}
        onUpdateDescription={handleUpdateDescription}
        onGenerateImage={handleGenerateImage}
        onReorderScenes={handleReorderScenes}
      />
      <ResourcePanel
        characters={allCharacters}
        locations={allLocations}
        props={allProps}
      />
    </div>
  );
};

export default StoryBoard;
