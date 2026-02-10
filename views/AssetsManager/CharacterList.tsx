import React from 'react';
import { Card, CardBody, Button, Chip } from '@heroui/react';
import { Edit, Trash2 } from 'lucide-react';
import { Character } from '../../services/assets';

interface CharacterListProps {
  characters: Character[];
  onEdit: (character: Character) => void;
  onDelete: (id: number) => void;
}

const CharacterList: React.FC<CharacterListProps> = ({ characters, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {characters.map((character) => (
        <Card key={character.id} className="bg-slate-900/80 border border-slate-700/50 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow">
          <CardBody className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-100">{character.name}</h3>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  isIconOnly 
                  variant="light" 
                  onPress={() => onEdit(character)} 
                  className="hover:bg-blue-500/10"
                >
                  <Edit className="w-4 h-4 text-blue-400" />
                </Button>
                <Button 
                  size="sm" 
                  isIconOnly 
                  variant="light" 
                  onPress={() => onDelete(character.id)} 
                  className="hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{character.description}</p>
            <div className="flex flex-wrap gap-2">
              {character.project_name && (
                <Chip 
                  size="sm" 
                  variant="flat" 
                  className="bg-emerald-500/10 text-emerald-400 font-medium"
                >
                  {character.project_name}
                </Chip>
              )}
              {character.tags && character.tags.split(',').map((tag, idx) => (
                <Chip 
                  key={idx} 
                  size="sm" 
                  variant="flat" 
                  className="bg-blue-500/10 text-blue-400 font-medium"
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

export default CharacterList;
