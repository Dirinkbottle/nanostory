import React from 'react';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

interface DarkEpisodeSelectorProps {
  scripts: Script[];
  currentEpisode: number;
  onSelect: (script: Script) => void;
}

const DarkEpisodeSelector: React.FC<DarkEpisodeSelectorProps> = ({ scripts, currentEpisode, onSelect }) => {
  if (scripts.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">集数</span>
      <div className="flex gap-1">
        {scripts.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              currentEpisode === s.episode_number
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
            }`}
          >
            {s.episode_number}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DarkEpisodeSelector;
