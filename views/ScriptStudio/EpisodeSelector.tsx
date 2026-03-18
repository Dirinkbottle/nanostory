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
  /** 当前选中的草稿集数（用户已选择但尚未开始生成） */
  draftEpisode?: number | null;
}

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  scripts,
  currentEpisode,
  nextEpisode,
  loading,
  onEpisodeChange,
  onNewEpisode,
  draftEpisode
}) => {
  // 检查草稿集数是否已存在于 scripts 中（已开始生成）
  const isDraftInScripts = draftEpisode ? scripts.some(s => s.episode_number === draftEpisode) : false;
  // 只有当草稿集数存在且不在 scripts 中时才显示草稿标签
  const showDraftTab = draftEpisode && !isDraftInScripts;

  if (scripts.length === 0 && !showDraftTab) return null;

  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-700/30">
      <span className="text-sm text-slate-500 font-medium">集数:</span>
      <div className="flex gap-2 flex-wrap flex-1">
        {/* 已有集数 */}
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
        
        {/* 草稿集数（用户已选择但尚未开始生成） */}
        {showDraftTab && (
          <button
            onClick={() => onEpisodeChange(draftEpisode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentEpisode === draftEpisode
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            第{draftEpisode}集 (草稿)
          </button>
        )}
      </div>
      <button
        onClick={onNewEpisode}
        disabled={loading || !!showDraftTab}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 disabled:opacity-50 shadow-md shadow-emerald-500/20"
      >
        <span className="text-lg leading-none">+</span> 生成第{nextEpisode}集
      </button>
    </div>
  );
};

export default EpisodeSelector;
