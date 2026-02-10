import React from 'react';
import { Textarea } from '@heroui/react';
import { Trash2, Edit2, Check } from 'lucide-react';
import { StoryboardScene } from '../useSceneManager';

interface SceneCardContentProps {
  scene: StoryboardScene;
  isEditingDescription: boolean;
  editedDescription: string;
  onEditedDescriptionChange: (value: string) => void;
  onSaveDescription: () => void;
  onStartEditing: () => void;
  onDelete: (id: number) => void;
}

const SceneCardContent: React.FC<SceneCardContentProps> = ({
  scene,
  isEditingDescription,
  editedDescription,
  onEditedDescriptionChange,
  onSaveDescription,
  onStartEditing,
  onDelete
}) => {
  return (
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea
              value={editedDescription}
              onValueChange={onEditedDescriptionChange}
              minRows={3}
              classNames={{
                input: "text-sm bg-transparent text-slate-100",
                inputWrapper: "bg-slate-800/60 border border-blue-500/50"
              }}
            />
            <button
              onClick={onSaveDescription}
              className="px-3 py-1 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs rounded-md hover:opacity-90 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              保存
            </button>
          </div>
        ) : (
          <div className="group">
            <div className="flex items-start gap-2">
              <p className="text-sm text-slate-300 leading-relaxed flex-1">
                {scene.description || '暂无描述'}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditing();
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
            {scene.dialogue && (
              <p className="text-xs text-slate-500 mt-1 italic">
                {scene.dialogue}
              </p>
            )}
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(scene.id);
        }}
        className="p-1 text-red-400 hover:bg-red-500/10 rounded ml-2"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SceneCardContent;
