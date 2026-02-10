/**
 * FFmpeg 导出 Hook
 * 使用 FFmpeg.wasm 在浏览器端拼接视频片段
 */

import { useState, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { CompositionClip, ExportOptions, ExportProgress } from '../types';

export function useFFmpegExport() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const logsRef = useRef<string[]>([]);
  const startTimeRef = useRef<number>(0);
  const [progress, setProgress] = useState<ExportProgress>({
    stage: 'idle',
    percent: 0,
    message: ''
  });

  const addLog = useCallback((msg: string) => {
    const elapsed = startTimeRef.current ? ((Date.now() - startTimeRef.current) / 1000).toFixed(1) : '0.0';
    const entry = `[${elapsed}s] ${msg}`;
    logsRef.current = [...logsRef.current, entry];
    console.log('[FFmpegExport]', entry);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const updateProgress = useCallback((patch: Partial<ExportProgress>) => {
    setProgress(prev => ({ ...prev, debugLogs: logsRef.current, ...patch }));
  }, []);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress: p, time }) => {
      const pct = Math.min(Math.round(p * 100), 99);
      const timeStr = time > 0 ? ` (${(time / 1000000).toFixed(1)}s)` : '';
      updateProgress({
        percent: 40 + Math.round(pct * 0.5),
        message: `编码中... ${pct}%`,
        detail: `FFmpeg 编码进度${timeStr}`
      });
    });
    ffmpeg.on('log', ({ message }) => {
      addLog(`[ffmpeg] ${message}`);
    });

    updateProgress({ stage: 'loading', percent: 0, message: '加载 FFmpeg WASM...', detail: '首次加载约 30MB，后续有缓存' });
    addLog('开始加载 FFmpeg WASM 核心...');

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    addLog('FFmpeg WASM 加载完成');
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, [addLog, updateProgress]);

  const exportVideo = useCallback(async (
    clips: CompositionClip[],
    options: ExportOptions = { format: 'mp4', resolution: '1080p', fps: 30 }
  ) => {
    if (clips.length === 0) {
      setProgress({ stage: 'error', percent: 0, message: '没有可导出的片段' });
      return null;
    }

    const totalSteps = clips.length + 3; // download × N + concat + encode + output
    logsRef.current = [];
    startTimeRef.current = Date.now();

    try {
      addLog(`开始导出: ${clips.length} 个片段, ${options.resolution}, ${options.fps}fps`);
      const ffmpeg = await loadFFmpeg();

      // ── Step 1: 下载所有视频片段 ──
      let totalDownloadSize = 0;
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const stepNum = i + 1;
        updateProgress({
          stage: 'processing',
          percent: Math.round((i / clips.length) * 35),
          message: `下载片段 ${stepNum}/${clips.length}`,
          detail: `分镜 #${clip.order} — ${clip.description?.substring(0, 30) || '无描述'}...`,
          currentStep: stepNum,
          totalSteps,
          startTime: startTimeRef.current
        });

        addLog(`下载片段 ${stepNum}: storyboard=${clip.storyboardId}, url=${clip.videoUrl.substring(0, 60)}...`);
        const data = await fetchFile(clip.videoUrl);
        const size = (data as Uint8Array).byteLength || 0;
        totalDownloadSize += size;
        addLog(`片段 ${stepNum} 下载完成: ${formatBytes(size)}`);

        await ffmpeg.writeFile(`input_${i}.mp4`, data);
      }
      addLog(`全部片段下载完成, 总大小: ${formatBytes(totalDownloadSize)}`);

      // ── Step 2: 生成 concat 文件列表 ──
      updateProgress({
        stage: 'processing',
        percent: 36,
        message: '准备合成...',
        detail: '生成拼接文件列表',
        currentStep: clips.length + 1,
        totalSteps,
        startTime: startTimeRef.current
      });

      let concatContent = '';
      for (let i = 0; i < clips.length; i++) {
        concatContent += `file 'input_${i}.mp4'\n`;
      }
      await ffmpeg.writeFile('filelist.txt', concatContent);
      addLog('concat 文件列表已写入');

      // ── Step 3: FFmpeg 编码 ──
      const scaleFilter = options.resolution === '1080p'
        ? 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
        : 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2';

      const ffmpegArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'filelist.txt',
        '-vf', scaleFilter,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-r', String(options.fps),
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        'output.mp4'
      ];

      addLog(`FFmpeg 命令: ffmpeg ${ffmpegArgs.join(' ')}`);
      updateProgress({
        stage: 'processing',
        percent: 40,
        message: '编码中...',
        detail: `${options.resolution} / ${options.fps}fps / H.264`,
        currentStep: clips.length + 2,
        totalSteps,
        startTime: startTimeRef.current
      });

      const encodeStart = Date.now();
      await ffmpeg.exec(ffmpegArgs);
      const encodeSec = ((Date.now() - encodeStart) / 1000).toFixed(1);
      addLog(`编码完成, 耗时: ${encodeSec}s`);

      // ── Step 4: 读取输出 + 清理 ──
      updateProgress({
        stage: 'processing',
        percent: 92,
        message: '生成文件...',
        detail: '读取编码结果',
        currentStep: clips.length + 3,
        totalSteps,
        startTime: startTimeRef.current
      });

      const outputData = await ffmpeg.readFile('output.mp4');
      const outputBytes = (outputData as Uint8Array).byteLength || 0;
      addLog(`输出文件大小: ${formatBytes(outputBytes)}`);

      const blob = new Blob([new Uint8Array(outputData as Uint8Array)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      for (let i = 0; i < clips.length; i++) {
        await ffmpeg.deleteFile(`input_${i}.mp4`).catch(() => {});
      }
      await ffmpeg.deleteFile('filelist.txt').catch(() => {});
      await ffmpeg.deleteFile('output.mp4').catch(() => {});
      addLog('虚拟文件系统已清理');

      const totalSec = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      addLog(`导出完成! 总耗时: ${totalSec}s, 输出: ${formatBytes(outputBytes)}`);

      setProgress({
        stage: 'done',
        percent: 100,
        message: '导出完成！',
        detail: `${formatBytes(outputBytes)} · 耗时 ${totalSec}s`,
        debugLogs: logsRef.current,
        startTime: startTimeRef.current
      });
      return url;
    } catch (err: any) {
      const totalSec = startTimeRef.current ? ((Date.now() - startTimeRef.current) / 1000).toFixed(1) : '?';
      addLog(`❌ 导出失败 (${totalSec}s): ${err.message}`);
      addLog(`Stack: ${err.stack || '无'}`);
      console.error('[useFFmpegExport] 导出失败:', err);
      setProgress({
        stage: 'error',
        percent: 0,
        message: `导出失败: ${err.message}`,
        detail: `耗时 ${totalSec}s · 查看 debug 日志获取详情`,
        debugLogs: logsRef.current,
        startTime: startTimeRef.current
      });
      return null;
    }
  }, [loadFFmpeg, addLog, updateProgress, formatBytes]);

  const downloadVideo = useCallback((blobUrl: string, filename: string = 'composition.mp4') => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ stage: 'idle', percent: 0, message: '' });
  }, []);

  return {
    progress,
    exportVideo,
    downloadVideo,
    resetProgress
  };
}
