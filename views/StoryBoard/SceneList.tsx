import React, { useState } from 'react';
import { Button } from '@heroui/react';
import { Plus } from 'lucide-react';
import SceneCard from './SceneCard';

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

interface SceneListProps {
  scenes: StoryboardScene[];
  selectedScene: number | null;
  onSelectScene: (id: number) => void;
  onMoveScene: (id: number, direction: 'up' | 'down') => void;
  onDeleteScene: (id: number) => void;
  onAddScene: () => void;
  onUpdateDescription: (id: number, description: string) => void;
  onGenerateImage: (id: number, prompt: string) => void;
  onReorderScenes: (newScenes: StoryboardScene[]) => void;
}

const SceneList: React.FC<SceneListProps> = ({
  scenes,
  selectedScene,
  onSelectScene,
  onMoveScene,
  onDeleteScene,
  onAddScene,
  onUpdateDescription,
  onGenerateImage,
  onReorderScenes
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(dropIndex, 0, draggedScene);
    
    onReorderScenes(newScenes);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  return (
    <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">分镜列表</h2>
          <Button
            size="sm"
            className="bg-blue-600 text-white font-semibold hover:bg-blue-700"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onAddScene}
          >
            添加分镜
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-200 ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            } ${
              dragOverIndex === index ? 'transform translate-y-2' : ''
            }`}
          >
            <SceneCard
              scene={scene}
              index={index}
              isSelected={selectedScene === scene.id}
              isFirst={index === 0}
              isLast={index === scenes.length - 1}
              onSelect={onSelectScene}
              onMoveUp={onMoveScene}
              onMoveDown={onMoveScene}
              onDelete={onDeleteScene}
              onUpdateDescription={onUpdateDescription}
              onGenerateImage={onGenerateImage}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SceneList;
