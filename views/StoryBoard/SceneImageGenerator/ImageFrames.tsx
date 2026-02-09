import React from 'react';
import { Spinner } from '@heroui/react';
import { Plus, RefreshCw, ZoomIn, X } from 'lucide-react';

interface ImageFramesProps {
  startFrame?: string;
  endFrame?: string;
  hasAction?: boolean;
  isGenerating: boolean;
  hasImages: boolean;
  onQuickGenerate: () => void;
  onOpenGenerateModal: () => void;
  onPreview: (imageUrl: string) => void;
  onDeleteFrames?: () => void;
  error: string | null;
}

const ImageFrames: React.FC<ImageFramesProps> = ({
  startFrame,
  endFrame,
  hasAction,
  isGenerating,
  hasImages,
  onQuickGenerate,
  onOpenGenerateModal,
  onPreview,
  onDeleteFrames,
  error
}) => {
  const showEndFrame = hasAction;

  return (
    <>
      <div className="flex gap-2 flex-shrink-0">
        {/* 图片 / 首帧 */}
        <div className="w-20 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group transition-all duration-300 border border-slate-300 relative overflow-hidden">
          {startFrame ? (
            <>
              <img 
                src={startFrame} 
                alt={hasAction ? "首帧" : "图片"}
                className="w-full h-full object-cover rounded-lg cursor-pointer" 
                onClick={() => onPreview(startFrame)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1">
                <button
                  onClick={() => onPreview(startFrame)}
                  className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="预览"
                >
                  <ZoomIn className="w-3 h-3 text-slate-700" />
                </button>
              </div>
              {onDeleteFrames && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFrames(); }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title={hasAction ? '删除首尾帧' : '删除图片'}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              )}
              {hasAction && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">首帧</div>
              )}
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-1 text-blue-500">
              <Spinner size="sm" color="primary" />
              <span className="text-[10px]">生成中</span>
            </div>
          ) : (
            <div 
              onClick={onQuickGenerate}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer w-full h-full justify-center"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px]">{hasAction ? '首帧' : '生成'}</span>
            </div>
          )}
        </div>

        {/* 尾帧 - 仅在有动作且首帧已存在时显示 */}
        {showEndFrame && (
          <div className="w-20 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group transition-all duration-300 border border-orange-300 relative overflow-hidden">
            {endFrame ? (
              <>
                <img 
                  src={endFrame} 
                  alt="尾帧" 
                  className="w-full h-full object-cover rounded-lg cursor-pointer" 
                  onClick={() => onPreview(endFrame)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1">
                  <button
                    onClick={() => onPreview(endFrame)}
                    className="p-1 bg-white/90 rounded-full hover:bg-white transition-colors"
                    title="预览"
                  >
                    <ZoomIn className="w-3 h-3 text-slate-700" />
                  </button>
                </div>
                {onDeleteFrames && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteFrames(); }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="删除首尾帧"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-orange-500/70 text-white text-[10px] text-center py-0.5">尾帧</div>
              </>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-1 text-orange-500">
                <Spinner size="sm" color="warning" />
                <span className="text-[10px]">等待</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-orange-300 w-full h-full justify-center cursor-default">
                <span className="text-[10px]">尾帧</span>
              </div>
            )}
          </div>
        )}

        {/* 重新生成按钮 */}
        {hasImages && (
          <button
            onClick={onOpenGenerateModal}
            className="w-8 h-14 bg-slate-100 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors border border-slate-300"
            title="重新生成"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 hover:text-blue-600" />
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}
    </>
  );
};

export default ImageFrames;
