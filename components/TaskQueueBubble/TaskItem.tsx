import React, { useState } from 'react';
import { Progress } from '@heroui/react';
import { X } from 'lucide-react';
import { WorkflowJob, cancelWorkflow } from '../../hooks/useWorkflow';

// 任务类型中文映射
const WORKFLOW_TYPE_NAMES: Record<string, string> = {
  'script_only': '剧本生成',
  'storyboard_generation': '智能分镜',
  'frame_generation': '首尾帧生成',
  'single_frame_generation': '单帧生成',
  'scene_video': '视频生成',
  'character_views_generation': '角色三视图生成',
  'scene_image_generation': '场景图生成',
  'batch_frame_generation': '批量帧生成',
  'batch_scene_video_generation': '批量视频生成',
  'smart_parse': 'AI 智能解析',
};

// 相对时间格式化
const formatRelativeTime = (dateStr: string): string => {
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  const diff = Math.max(0, now - created);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
};

// 解析 input_params
const parseInputParams = (job: WorkflowJob): Record<string, any> => {
  if (!job.input_params) return {};
  if (typeof job.input_params === 'string') {
    try {
      return JSON.parse(job.input_params);
    } catch {
      return {};
    }
  }
  return job.input_params;
};

// 获取任务显示名称（包含详细信息）
const getTaskName = (job: WorkflowJob): string => {
  const baseName = job.workflowName && job.workflowName !== job.workflow_type
    ? job.workflowName
    : WORKFLOW_TYPE_NAMES[job.workflow_type] || job.workflow_type;
  
  const params = parseInputParams(job);
  const parts: string[] = [];
  
  // 集数信息
  if (params.episodeNumber) {
    parts.push(`第${params.episodeNumber}集`);
  }
  
  // 分镜序号信息
  if (params.storyboardIndex || params.sceneIndex) {
    const idx = params.storyboardIndex || params.sceneIndex;
    parts.push(`第${idx}个分镜`);
  }
  
  // 角色名称
  if (params.characterName) {
    parts.push(`「${params.characterName}」`);
  }
  
  // 场景名称
  if (params.sceneName) {
    parts.push(`「${params.sceneName}」`);
  }

  // 重新生成标记
  const prefix = params.isRegenerate ? '重新' : '';
  
  // 组合显示
  if (parts.length > 0) {
    return `${parts.join(' ')} ${prefix}${baseName}`;
  }
  
  return `${prefix}${baseName}`;
};

interface TaskItemProps {
  job: WorkflowJob;
  progress: number;
  statusColor: string;
  statusLabel: string;
  onCancelled?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ job, progress, statusColor, statusLabel, onCancelled }) => {
  const taskName = getTaskName(job);
  const [cancelling, setCancelling] = useState(false);
  const canCancel = job.status === 'pending' || job.status === 'running';

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cancelling || !canCancel) return;
    if (!window.confirm(`确定要取消任务「${getTaskName(job)}」吗？`)) return;
    setCancelling(true);
    try {
      await cancelWorkflow(job.id);
      onCancelled?.();
    } catch (err) {
      console.error('[TaskItem] 取消失败:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="rounded-xl p-3 border bg-blue-500/5 border-blue-500/20 group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-slate-200 truncate flex-1">
          {taskName}
        </span>
        <span className={`text-[10px] font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
            title="取消任务"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5">
        <span>#{job.id}</span>
        <span>·</span>
        <span>{job.current_step_index + 1}/{job.total_steps} 步</span>
        {job.created_at && (
          <>
            <span>·</span>
            <span>{formatRelativeTime(job.created_at)}</span>
          </>
        )}
      </div>
      <Progress
        size="sm"
        value={progress}
        color="primary"
      />
    </div>
  );
};

export default TaskItem;
