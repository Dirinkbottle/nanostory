/**
 * 左侧边栏：集列表 + 可折叠分镜视频列表
 */

import React from 'react';
import { Button, Chip } from '@heroui/react';
import { ChevronDown, ChevronRight, Film, Play, Plus, ListVideo } from 'lucide-react';
import type { EpisodeGroup, CompositionClip } from '../types';

interface EpisodeSidebarProps {
  episodes: EpisodeGroup[];
  selectedEpisode: number | null;
  loading: boolean;
  onSelectEpisode: (episodeNumber: number) => void;
  onToggleEpisode: (episodeNumber: number) => void;
  onPreviewClip: (clip: CompositionClip) => void;
  onAddEpisodeToTimeline: (clips: CompositionClip[]) => void;
  onAddClipToTimeline: (clip: CompositionClip) => void;
}

const EpisodeSidebar: React.FC<EpisodeSidebarProps> = ({
  episodes,
  selectedEpisode,
  loading,
  onSelectEpisode,
  onToggleEpisode,
  onPreviewClip,
  onAddEpisodeToTimeline,
  onAddClipToTimeline
}) => {
  if (loading) {
    return (
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex items-center justify-center">
        <div className="text-center text-slate-400 px-6">
          <ListVideo className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">暂无视频</p>
          <p className="text-xs mt-1">请先在分镜页面生成视频</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-800">视频片段</h3>
        <p className="text-xs text-slate-400 mt-1">
          {episodes.length} 集 · {episodes.reduce((sum, ep) => sum + ep.clips.length, 0)} 个片段
        </p>
      </div>

      {/* 集列表 */}
      <div className="flex-1 overflow-y-auto">
        {episodes.map((episode) => (
          <EpisodeItem
            key={episode.scriptId}
            episode={episode}
            isSelected={selectedEpisode === episode.episodeNumber}
            onSelect={() => onSelectEpisode(episode.episodeNumber)}
            onToggle={() => onToggleEpisode(episode.episodeNumber)}
            onPreviewClip={onPreviewClip}
            onAddToTimeline={() => onAddEpisodeToTimeline(episode.clips)}
            onAddClipToTimeline={onAddClipToTimeline}
          />
        ))}
      </div>
    </div>
  );
};

interface EpisodeItemProps {
  episode: EpisodeGroup;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onPreviewClip: (clip: CompositionClip) => void;
  onAddToTimeline: () => void;
  onAddClipToTimeline: (clip: CompositionClip) => void;
}

const EpisodeItem: React.FC<EpisodeItemProps> = ({
  episode,
  isSelected,
  onSelect,
  onToggle,
  onPreviewClip,
  onAddToTimeline,
  onAddClipToTimeline
}) => {
  const videoCount = episode.clips.length;

  return (
    <div className={`border-b border-slate-100 ${isSelected ? 'bg-blue-50/50' : ''}`}>
      {/* 集标题行 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => { onSelect(); onToggle(); }}
      >
        <button className="text-slate-400 hover:text-slate-600 flex-shrink-0">
          {episode.expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <Film className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
            第 {episode.episodeNumber} 集
          </p>
        </div>

        <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-500 text-xs">
          {videoCount}
        </Chip>

        {videoCount > 0 && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-blue-500 hover:text-blue-700 min-w-6 w-6 h-6"
            onPress={(e) => { onAddToTimeline(); }}
            title="添加整集到时间线"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* 分镜视频列表（可折叠） */}
      {episode.expanded && (
        <div className="pb-1">
          {videoCount === 0 ? (
            <p className="text-xs text-slate-400 px-10 py-2">暂无视频片段</p>
          ) : (
            episode.clips.map((clip, idx) => (
              <ClipItem
                key={clip.id}
                clip={clip}
                index={idx}
                onPreview={() => onPreviewClip(clip)}
                onAdd={() => onAddClipToTimeline(clip)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

interface ClipItemProps {
  clip: CompositionClip;
  index: number;
  onPreview: () => void;
  onAdd: () => void;
}

const ClipItem: React.FC<ClipItemProps> = ({ clip, index, onPreview, onAdd }) => {
  return (
    <div
      className="flex items-center gap-2 px-4 pl-10 py-1.5 cursor-pointer transition-colors group hover:bg-slate-50 text-slate-600"
      onClick={onPreview}
    >
      <Play className="w-3 h-3 flex-shrink-0 text-slate-400 group-hover:text-blue-500" />
      <span className="text-xs font-medium flex-shrink-0">#{index + 1}</span>
      <span className="text-xs truncate flex-1 opacity-80">
        {clip.description.substring(0, 30) || clip.dialogue.substring(0, 30) || '无描述'}
      </span>
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className="opacity-0 group-hover:opacity-100 text-blue-500 min-w-5 w-5 h-5"
        onPress={onAdd}
        title="添加到时间线"
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default EpisodeSidebar;
