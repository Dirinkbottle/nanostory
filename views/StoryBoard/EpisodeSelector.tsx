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
      <span className="text-sm text-slate-400">集数:</span>
      <div className="flex gap-1">
        {scripts.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              currentEpisode === s.episode_number
                ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
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
