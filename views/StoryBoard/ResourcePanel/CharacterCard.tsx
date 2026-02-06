import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Layers, Eye, User } from 'lucide-react';
import { Character } from './types';

interface CharacterCardProps {
  character: Character;
  scenes?: any[];
  onGenerateViews: (charName: string, characterId: number) => void;
  onShowDetail: (character: Character) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  scenes,
  onGenerateViews,
  onShowDetail
}) => {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 shadow-sm hover:shadow-md transition-shadow border border-blue-100">
      <CardBody className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            {character.imageUrl ? (
              <img src={character.imageUrl} alt={character.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-slate-800 truncate">{character.name}</h4>
              <span className="text-xs text-slate-500 ml-2">
                {scenes?.filter(s => s.characters?.includes(character.name)).length || 0} 次
              </span>
            </div>
            {character.appearance && (
              <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                <span className="font-semibold">外貌：</span>{character.appearance}
              </p>
            )}
            {character.personality && (
              <p className="text-xs text-slate-600 line-clamp-1">
                <span className="font-semibold">性格：</span>{character.personality}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            className="flex-1 bg-purple-100 text-purple-700 text-xs font-medium"
            startContent={<Layers className="w-3 h-3" />}
            onPress={() => onGenerateViews(character.name, character.id)}
          >
            三视图
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="flex-1 bg-blue-100 text-blue-700 text-xs font-medium"
            startContent={<Eye className="w-3 h-3" />}
            onPress={() => onShowDetail(character)}
          >
            详情
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default CharacterCard;
