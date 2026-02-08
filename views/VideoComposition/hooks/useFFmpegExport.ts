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
  const [progress, setProgress] = useState<ExportProgress>({
    stage: 'idle',
    percent: 0,
    message: ''
  });

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(prev => ({
        ...prev,
        percent: Math.round(p * 100),
        message: `处理中... ${Math.round(p * 100)}%`
      }));
    });

    setProgress({ stage: 'loading', percent: 0, message: '加载 FFmpeg...' });

    // 加载 FFmpeg WASM 核心
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  const exportVideo = useCallback(async (
    clips: CompositionClip[],
    options: ExportOptions = { format: 'mp4', resolution: '1080p', fps: 30 }
  ) => {
    if (clips.length === 0) {
      setProgress({ stage: 'error', percent: 0, message: '没有可导出的片段' });
      return null;
    }

    try {
      const ffmpeg = await loadFFmpeg();

      setProgress({ stage: 'processing', percent: 0, message: '下载视频片段...' });

      // 1. 下载所有视频片段到 FFmpeg 虚拟文件系统
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        setProgress({
          stage: 'processing',
          percent: Math.round((i / clips.length) * 30),
          message: `下载片段 ${i + 1}/${clips.length}...`
        });

        const data = await fetchFile(clip.videoUrl);
        await ffmpeg.writeFile(`input_${i}.mp4`, data);
      }

      // 2. 生成 concat 文件列表
      let concatContent = '';
      for (let i = 0; i < clips.length; i++) {
        concatContent += `file 'input_${i}.mp4'\n`;
      }
      await ffmpeg.writeFile('filelist.txt', concatContent);

      setProgress({ stage: 'processing', percent: 40, message: '合成视频中...' });

      // 3. 使用 concat 拼接
      const scaleFilter = options.resolution === '1080p'
        ? 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
        : 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2';

      await ffmpeg.exec([
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
      ]);

      setProgress({ stage: 'processing', percent: 90, message: '生成文件...' });

      // 4. 读取输出文件
      const outputData = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([new Uint8Array(outputData as Uint8Array)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      // 5. 清理虚拟文件系统
      for (let i = 0; i < clips.length; i++) {
        await ffmpeg.deleteFile(`input_${i}.mp4`).catch(() => {});
      }
      await ffmpeg.deleteFile('filelist.txt').catch(() => {});
      await ffmpeg.deleteFile('output.mp4').catch(() => {});

      setProgress({ stage: 'done', percent: 100, message: '导出完成！' });
      return url;
    } catch (err: any) {
      console.error('[useFFmpegExport] 导出失败:', err);
      setProgress({ stage: 'error', percent: 0, message: `导出失败: ${err.message}` });
      return null;
    }
  }, [loadFFmpeg]);

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
