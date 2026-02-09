import React from 'react';
import { User, MapPin, Package, Trash2 } from 'lucide-react';
import { SlotType } from '../AvatarSlot';

interface ResourceCardProps {
  type: SlotType;
  name: string;
  imageUrl?: string;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

const iconMap = { character: User, scene: MapPin, prop: Package };

const ResourceCard: React.FC<ResourceCardProps> = ({ type, name, imageUrl, isActive, onClick, onDelete }) => {
  const Icon = iconMap[type];

  return (
    <div
      className={`relative group cursor-pointer rounded-xl overflow-hidden border transition-all ${
        isActive
          ? 'border-cyan-500 ring-1 ring-cyan-500/30'
          : 'border-slate-700 hover:border-slate-500'
      }`}
      onClick={onClick}
    >
      {/* 图片区域 */}
      <div className="aspect-square bg-slate-800 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-500">
            <Icon className="w-8 h-8" />
            <span className="text-[10px]">暂无图片</span>
          </div>
        )}
      </div>

      {/* 名字 */}
      <div className="px-2 py-1.5 bg-slate-800/80">
        <p className={`text-xs font-medium text-center truncate ${isActive ? 'text-cyan-400' : 'text-slate-300'}`}>
          {name}
        </p>
      </div>

      {/* 删除按钮 */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 p-1 rounded bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
          title="删除"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* 在线指示 */}
      {imageUrl && (
        <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-800" />
      )}
    </div>
  );
};

export default ResourceCard;
