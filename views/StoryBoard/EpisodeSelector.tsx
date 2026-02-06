import React from 'react';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

interface EpisodeSelectorProps {
  scripts: Script[];
  currentEpisode: number;
  onSelect: (script: Script) => void;
}

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  scripts,
  currentEpisode,
  onSelect
}) => {
  if (scripts.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">集数:</span>
      <div className="flex gap-1">
        {scripts.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              currentEpisode === s.episode_number
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            第{s.episode_number}集
          </button>
        ))}
      </div>
    </div>
  );
};

export default EpisodeSelector;
