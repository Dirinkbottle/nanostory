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
        <Card key={character.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardBody className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{character.name}</h3>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  isIconOnly 
                  variant="light" 
                  onPress={() => onEdit(character)} 
                  className="hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </Button>
                <Button 
                  size="sm" 
                  isIconOnly 
                  variant="light" 
                  onPress={() => onDelete(character.id)} 
                  className="hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">{character.description}</p>
            {character.tags && (
              <div className="flex flex-wrap gap-2">
                {character.tags.split(',').map((tag, idx) => (
                  <Chip 
                    key={idx} 
                    size="sm" 
                    variant="flat" 
                    className="bg-blue-50 text-blue-600 font-medium"
                  >
                    {tag.trim()}
                  </Chip>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default CharacterList;
