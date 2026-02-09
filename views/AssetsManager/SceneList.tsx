import React from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Scene } from '../../services/assets';

interface SceneListProps {
  scenes: Scene[];
  onEdit: (scene: Scene) => void;
  onDelete: (id: number) => void;
  onViewDetail?: (scene: Scene) => void;
}

const SceneList: React.FC<SceneListProps> = ({ scenes, onEdit, onDelete, onViewDetail }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {scenes.map((scene) => (
        <Card key={scene.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardBody className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{scene.name}</h3>
              <div className="flex gap-1">
                {onViewDetail && (
                  <Button 
                    size="sm" 
                    isIconOnly 
                    variant="light" 
                    onPress={() => onViewDetail(scene)} 
                    className="hover:bg-green-50"
                  >
                    <Eye className="w-4 h-4 text-green-600" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  isIconOnly 
                  variant="light" 
                  onPress={() => onEdit(scene)} 
                  className="hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </Button>
                <Button 
                  size="sm" 
                  isIconOnly 
                  variant="light" 
                  onPress={() => onDelete(scene.id)} 
                  className="hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">{scene.description}</p>
            <div className="flex flex-wrap gap-2">
              {scene.project_name && (
                <Chip 
                  size="sm" 
                  variant="flat" 
                  className="bg-emerald-50 text-emerald-600 font-medium"
                >
                  {scene.project_name}
                </Chip>
              )}
              {scene.tags && scene.tags.split(',').map((tag, idx) => (
                <Chip 
                  key={idx} 
                  size="sm" 
                  variant="flat" 
                  className="bg-sky-50 text-sky-600 font-medium"
                >
                  {tag.trim()}
                </Chip>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default SceneList;
