/**
 * 底部导出工具栏
 */

import React from 'react';
import { Button, Progress } from '@heroui/react';
import { Download, Trash2, RotateCcw } from 'lucide-react';
import type { ExportProgress } from '../types';

interface ExportToolbarProps {
  clipCount: number;
  totalDuration: number;
  exportProgress: ExportProgress;
  onExport: () => void;
  onClearTimeline: () => void;
}

const ExportToolbar: React.FC<ExportToolbarProps> = ({
  clipCount,
  totalDuration,
  exportProgress,
  onExport,
  onClearTimeline
}) => {
  const isExporting = exportProgress.stage === 'loading' || exportProgress.stage === 'processing';

  return (
    <div className="bg-slate-900/80 border-t border-slate-700/50 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500">
          {clipCount} 个片段 · 总时长 {formatDuration(totalDuration)}
        </span>

        {exportProgress.stage !== 'idle' && (
          <div className="flex items-center gap-3 min-w-[200px]">
            {isExporting && (
              <Progress
                size="sm"
                value={exportProgress.percent}
                className="max-w-[160px]"
                classNames={{ indicator: "bg-blue-600" }}
              />
            )}
            <span className={`text-xs font-medium ${
              exportProgress.stage === 'done' ? 'text-green-400' :
              exportProgress.stage === 'error' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {exportProgress.message}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {clipCount > 0 && (
          <Button
            size="sm"
            variant="flat"
            className="bg-slate-800/60 text-slate-400 font-medium"
            startContent={<Trash2 className="w-3.5 h-3.5" />}
            onPress={onClearTimeline}
            isDisabled={isExporting}
          >
            清空
          </Button>
        )}

        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold"
          startContent={isExporting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          onPress={onExport}
          isDisabled={clipCount === 0 || isExporting}
        >
          {isExporting ? '导出中...' : '导出合成视频'}
        </Button>
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default ExportToolbar;
