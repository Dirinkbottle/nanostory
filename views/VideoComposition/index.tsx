/**
 * 视频合成主页面
 * 组合所有子组件：侧边栏、合成预览、时间线多轨道、属性面板、导出工具栏
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import EpisodeSidebar from './components/EpisodeSidebar';
import VideoPreview from './components/VideoPreview';
import ClipPreviewModal from './components/ClipPreviewModal';
import Timeline from './components/Timeline';
import SubtitleTrack from './components/SubtitleTrack';
import AudioTrack from './components/AudioTrack';
import ClipProperties from './components/ClipProperties';
import SubtitleStylePanel from './components/SubtitleStylePanel';
import ExportToolbar from './components/ExportToolbar';
import { useCompositionData } from './hooks/useCompositionData';
import { useTimeline } from './hooks/useTimeline';
import { useSubtitles } from './hooks/useSubtitles';
import { useBGM } from './hooks/useBGM';
import { useFFmpegExport } from './hooks/useFFmpegExport';
import type { CompositionClip } from './types';

interface VideoCompositionProps {
  projectId: number | null;
  projectName?: string;
}

const VideoComposition: React.FC<VideoCompositionProps> = ({ projectId, projectName }) => {
  const compositionData = useCompositionData(projectId);
  const timeline = useTimeline(compositionData.currentClips);
  const subtitles = useSubtitles();
  const bgm = useBGM();
  const ffmpeg = useFFmpegExport();

  // 右侧面板
  const [showPanel, setShowPanel] = useState(true);
  const [panelTab, setPanelTab] = useState<'clip' | 'subtitle'>('clip');

  // 单个分镜预览弹窗
  const [previewClip, setPreviewClip] = useState<CompositionClip | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 侧边栏片段点击 → 弹窗预览
  const handlePreviewClip = useCallback((clip: CompositionClip) => {
    setPreviewClip(clip);
    setPreviewOpen(true);
  }, []);

  // 合成预览检测到片段时长
  const handleDurationDetected = useCallback((clipId: string, duration: number) => {
    timeline.updateClip(clipId, { duration });
  }, [timeline.updateClip]);

  // 合成预览当前播放片段变化 → 高亮时间线
  const handleCurrentClipChange = useCallback((clipId: string | null) => {
    if (clipId) timeline.selectClip(clipId);
  }, [timeline.selectClip]);

  // BGM 跟随播放状态
  const handlePlayingChange = useCallback((playing: boolean) => {
    timeline.setPlaying(playing);
    bgm.syncPlayState(playing);
  }, [timeline.setPlaying, bgm.syncPlayState]);

  // 导出
  const handleExport = useCallback(async () => {
    if (timeline.clips.length === 0) return;
    const url = await ffmpeg.exportVideo(timeline.clips);
    if (url) {
      ffmpeg.downloadVideo(url, `composition_ep${compositionData.selectedEpisode || 1}.mp4`);
    }
  }, [timeline.clips, ffmpeg, compositionData.selectedEpisode]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：集列表 + 分镜视频 */}
        <EpisodeSidebar
          episodes={compositionData.episodes}
          selectedEpisode={compositionData.selectedEpisode}
          loading={compositionData.loading}
          projectName={projectName || ''}
          onSelectEpisode={compositionData.setSelectedEpisode}
          onToggleEpisode={compositionData.toggleEpisode}
          onPreviewClip={handlePreviewClip}
          onAddEpisodeToTimeline={timeline.addEpisodeClips}
          onAddClipToTimeline={timeline.addClip}
        />

        {/* 中间主区域 */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">
          {/* 上：合成预览播放器 */}
          <div className="flex-1 min-h-0">
            <VideoPreview
              clips={timeline.clips}
              playing={timeline.playing}
              onPlayingChange={handlePlayingChange}
              onDurationDetected={handleDurationDetected}
              onCurrentClipChange={handleCurrentClipChange}
            />
          </div>

          {/* 下：多轨道时间线 */}
          <div className="flex flex-col gap-1.5">
            <Timeline
              clips={timeline.clips}
              selectedClipId={timeline.selectedClipId}
              zoom={timeline.zoom}
              onSelectClip={timeline.selectClip}
              onReorder={timeline.handleReorder}
              onRemoveClip={timeline.removeClip}
              onZoomChange={timeline.setZoom}
            />
            <SubtitleTrack
              subtitles={subtitles.subtitles}
              clips={timeline.clips}
              selectedSubtitleId={subtitles.selectedSubtitleId}
              totalDuration={timeline.totalDuration}
              zoom={timeline.zoom}
              onSelectSubtitle={subtitles.setSelectedSubtitleId}
              onUpdateSubtitle={subtitles.updateSubtitle}
              onRemoveSubtitle={subtitles.removeSubtitle}
              onGenerateFromClips={subtitles.generateFromClips}
            />
            <AudioTrack
              bgm={bgm.bgm}
              totalDuration={timeline.totalDuration}
              zoom={timeline.zoom}
              onUpload={bgm.uploadBGM}
              onUpdate={bgm.updateBGM}
              onRemove={bgm.removeBGM}
            />
          </div>
        </div>

        {/* 右侧：属性面板 */}
        {showPanel && (
          <div className="w-64 flex-shrink-0 border-l border-slate-700/50 bg-slate-900/60 overflow-y-auto flex flex-col">
            {/* 面板 Tab 切换 */}
            <div className="flex border-b border-slate-700/50">
              <button
                className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
                  panelTab === 'clip'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                onClick={() => setPanelTab('clip')}
              >
                片段属性
              </button>
              <button
                className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
                  panelTab === 'subtitle'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                onClick={() => setPanelTab('subtitle')}
              >
                字幕样式
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-y-auto">
              {panelTab === 'clip' ? (
                <ClipProperties
                  clip={timeline.selectedClip}
                  onUpdate={timeline.updateClip}
                  onRemove={timeline.removeClip}
                />
              ) : (
                <div className="p-4">
                  <SubtitleStylePanel
                    style={subtitles.style}
                    selectedSubtitle={subtitles.selectedSubtitle}
                    onUpdateStyle={subtitles.updateStyle}
                    onUpdateSubtitle={subtitles.updateSubtitle}
                    onRemoveSubtitle={subtitles.removeSubtitle}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 面板切换按钮 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="absolute right-2 top-2 z-10 text-slate-400"
          onPress={() => setShowPanel(prev => !prev)}
          title={showPanel ? '收起面板' : '展开面板'}
        >
          {showPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </Button>
      </div>

      {/* 底部工具栏 */}
      <ExportToolbar
        clipCount={timeline.clips.length}
        totalDuration={timeline.totalDuration}
        exportProgress={ffmpeg.progress}
        onExport={handleExport}
        onClearTimeline={timeline.clearTimeline}
      />

      {/* 单个分镜视频预览弹窗 */}
      <ClipPreviewModal
        clip={previewClip}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default VideoComposition;
