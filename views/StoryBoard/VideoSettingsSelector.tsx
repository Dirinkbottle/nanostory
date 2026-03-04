import React from 'react';
import { Select, SelectItem } from '@heroui/react';
import { Film, Clock } from 'lucide-react';
import { useSystemConfigs } from '../../hooks/useSystemConfigs';

interface VideoSettingsSelectorProps {
  aspectRatio: string;
  duration: number;
  onAspectRatioChange: (value: string) => void;
  onDurationChange: (value: number) => void;
}

const VideoSettingsSelector: React.FC<VideoSettingsSelectorProps> = ({
  aspectRatio,
  duration,
  onAspectRatioChange,
  onDurationChange
}) => {
  const { configs, loading } = useSystemConfigs();

  const aspectRatioOptions = configs['video_aspect_ratios']?.config_value || [];
  const durationOptions = configs['video_durations']?.config_value || [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>加载设置...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* 长宽比选择器 */}
      <div className="flex items-center gap-2">
        <Film className="w-4 h-4 text-slate-400" />
        <Select
          size="sm"
          label="长宽比"
          selectedKeys={[aspectRatio]}
          onChange={(e) => onAspectRatioChange(e.target.value)}
          className="w-40"
          classNames={{
            trigger: "bg-slate-800/60 border-slate-600/50 hover:border-blue-500/50",
            label: "text-slate-400 text-xs",
            value: "text-slate-200 text-sm"
          }}
        >
          {aspectRatioOptions.map((option: any) => (
            <SelectItem key={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* 时长选择器 */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        <Select
          size="sm"
          label="时长"
          selectedKeys={[String(duration)]}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="w-32"
          classNames={{
            trigger: "bg-slate-800/60 border-slate-600/50 hover:border-blue-500/50",
            label: "text-slate-400 text-xs",
            value: "text-slate-200 text-sm"
          }}
        >
          {durationOptions.map((option: any) => (
            <SelectItem key={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default VideoSettingsSelector;
