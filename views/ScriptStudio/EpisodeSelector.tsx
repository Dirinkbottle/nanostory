/**
 * 集数选择器组件
 * 显示已有集数，允许快速切换和生成新集
 */

import React from 'react';
import { Script } from './hooks/useScriptManagement';

interface EpisodeSelectorProps {
  scripts: Script[];
  currentEpisode: number;
  nextEpisode: number;
  loading: boolean;
  onEpisodeChange: (episode: number) => void;
  onNewEpisode: () => void;
}

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  scripts,
  currentEpisode,
  nextEpisode,
  loading,
  onEpisodeChange,
  onNewEpisode
}) => {
  if (scripts.length === 0) return null;

  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-700/30">
      <span className="text-sm text-slate-500 font-medium">集数:</span>
      <div className="flex gap-2 flex-wrap flex-1">
        {scripts.map((s) => (
          <button
            key={s.id}
            onClick={() => onEpisodeChange(s.episode_number)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentEpisode === s.episode_number
                ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/30'
            } ${s.status === 'generating' ? 'animate-pulse' : ''}`}
          >
            第{s.episode_number}集
            {s.status === 'generating' && ' (生成中)'}
          </button>
        ))}
      </div>
      <button
        onClick={onNewEpisode}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 disabled:opacity-50 shadow-md shadow-emerald-500/20"
      >
        <span className="text-lg leading-none">+</span> 生成第{nextEpisode}集
      </button>
    </div>
  );
};

export default EpisodeSelector;
