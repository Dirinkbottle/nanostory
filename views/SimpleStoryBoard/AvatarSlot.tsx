import React from 'react';
import { User, MapPin, Package, Plus } from 'lucide-react';

export type SlotType = 'character' | 'scene' | 'prop';

interface AvatarSlotProps {
  type: SlotType;
  name?: string;
  imageUrl?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const iconMap = { character: User, scene: MapPin, prop: Package };

const borderColors = {
  character: 'border-cyan-500/40 hover:border-cyan-400',
  scene: 'border-emerald-500/40 hover:border-emerald-400',
  prop: 'border-amber-500/40 hover:border-amber-400',
};

const sizes = {
  sm: { box: 'w-10 h-10', icon: 'w-4 h-4', font: 'text-[10px]', maxW: 'max-w-[48px]' },
  md: { box: 'w-14 h-14', icon: 'w-5 h-5', font: 'text-xs', maxW: 'max-w-[64px]' },
};

const AvatarSlot: React.FC<AvatarSlotProps> = ({ type, name, imageUrl, size = 'sm', onClick }) => {
  const Icon = iconMap[type];
  const s = sizes[size];

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 group cursor-pointer`}
      title={name}
    >
      <div className={`${s.box} rounded-lg border ${borderColors[type]} bg-slate-800/60 overflow-hidden flex items-center justify-center transition-all relative`}>
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={name} className={`${s.box} object-cover`} />
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </>
        ) : (
          <Icon className={`${s.icon} text-slate-500`} />
        )}
      </div>
      {name && (
        <span className={`${s.font} text-slate-400 truncate ${s.maxW} text-center leading-tight group-hover:text-slate-200 transition-colors`}>
          {name}
        </span>
      )}
    </button>
  );
};

export const AddSlot: React.FC<{ type: SlotType; size?: 'sm' | 'md'; onClick?: () => void }> = ({ type, size = 'sm', onClick }) => {
  const s = sizes[size];
  const label = type === 'character' ? '角色' : type === 'scene' ? '场景' : '道具';
  return (
    <button
      onClick={onClick}
      className={`${s.box} rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-all cursor-pointer`}
      title={`添加${label}`}
    >
      <Plus className={s.icon} />
    </button>
  );
};

export default AvatarSlot;
