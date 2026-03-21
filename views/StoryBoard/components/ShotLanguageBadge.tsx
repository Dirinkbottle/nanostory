/**
 * 镜头语言参数徽章组件
 * 在分镜卡片上快速展示镜头参数
 */

import React from 'react';
import { Tooltip } from '@heroui/react';
import { ShotLanguage, getShotSizeLabel } from '../../../types/shotLanguage';

interface ShotLanguageBadgeProps {
  shotLanguage?: ShotLanguage;
  compact?: boolean;
}

// 图标映射
const ICONS: Record<string, string> = {
  extreme_close_up: '👁️', close_up: '😊', medium_close_up: '👤',
  medium_shot: '🧍', medium_long_shot: '🚶', long_shot: '🏞️', extreme_long_shot: '🌄',
  eye_level: '➡️', low_angle: '⬆️', high_angle: '⬇️', bird_eye: '🦅', worm_eye: '🐛',
  static: '📷', push: '🔍', pull: '🔭', pan: '↔️', tilt: '↕️', track: '🚂', dolly: '🏃', zoom: '🔎',
  shallow: '✨', medium: '⭕', deep: '📍',
  rule_of_thirds: '➕', center: '⭕', symmetry: '⚖️', leading_lines: '〰️', frame_in_frame: '🖼️',
  left: '⬅️', right: '➡️', on_axis: '⬆️',
  left_to_right: '➡️', right_to_left: '⬅️', towards_camera: '📷', away_from_camera: '🏃',
  cut: '✂️', fade: '☁️', dissolve: '⏳', wipe: '➡️', match_cut: '🎯',
};

const ShotLanguageBadge: React.FC<ShotLanguageBadgeProps> = ({ shotLanguage, compact = true }) => {
  if (!shotLanguage) return null;
  const { shotSize, cameraHeight, cameraMovement, shotDuration, axisPosition } = shotLanguage;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {shotSize && (
          <Tooltip content={`景别: ${getShotSizeLabel(shotSize)}`}>
            <span className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">
              {ICONS[shotSize] || '📷'}
            </span>
          </Tooltip>
        )}
        {cameraHeight && (
          <Tooltip content={`机位: ${cameraHeight}`}>
            <span className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">
              {ICONS[cameraHeight] || '📐'}
            </span>
          </Tooltip>
        )}
        {cameraMovement && cameraMovement !== 'static' && (
          <Tooltip content={`运动: ${cameraMovement}`}>
            <span className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">
              {ICONS[cameraMovement] || '↔️'}
            </span>
          </Tooltip>
        )}
        {shotDuration && (
          <Tooltip content={`时长: ${shotDuration}秒`}>
            <span className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">
              {shotDuration}s
            </span>
          </Tooltip>
        )}
        {axisPosition && (
          <Tooltip content={`轴线: ${axisPosition}`}>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              axisPosition === 'on_axis' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-300'
            }`}>
              {ICONS[axisPosition] || '➡️'}
            </span>
          </Tooltip>
        )}
      </div>
    );
  }

  const labelMap: Record<string, string> = {
    shotSize: '景别', cameraHeight: '机位', cameraMovement: '运动', lensType: '镜头',
    depthOfField: '景深', lightingMood: '光影', compositionRule: '构图', axisPosition: '轴线',
    screenDirection: '方向', shotDuration: '时长', transitionType: '转场',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(shotLanguage).map(([key, value]) => {
        if (!value) return null;
        const icon = ICONS[String(value)] || '•';
        return (
          <Tooltip key={key} content={`${labelMap[key]}: ${value}`}>
            <span className="inline-flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">
              <span>{icon}</span>
              <span className="text-slate-300">{String(value)}</span>
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default ShotLanguageBadge;
