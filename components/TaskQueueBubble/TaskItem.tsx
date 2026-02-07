import React from 'react';
import { Progress } from '@heroui/react';
import { WorkflowJob } from '../../hooks/useWorkflow';

// 任务类型中文映射
const WORKFLOW_TYPE_NAMES: Record<string, string> = {
  'script_only': '剧本生成',
  'storyboard_generation': '分镜生成',
  'scene_extraction': '场景提取',
  'character_extraction': '角色提取',
  'frame_generation': '首尾帧生成',
  'single_frame_generation': '单帧生成',
  'scene_video': '视频生成',
  'character_views_generation': '角色三视图生成',
  'scene_image_generation': '场景图生成',
  'batch_frame_generation': '批量帧生成',
  'batch_scene_video_generation': '批量视频生成',
  'smart_parse': 'AI 智能解析',
  'script_and_characters': '剧本 + 角色提取',
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
  
  // 组合显示
  if (parts.length > 0) {
    return `${parts.join(' ')} ${baseName}`;
  }
  
  return baseName;
};

interface TaskItemProps {
  job: WorkflowJob;
  progress: number;
  statusColor: string;
  statusLabel: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ job, progress, statusColor, statusLabel }) => {
  const taskName = getTaskName(job);
  
  return (
    <div className="rounded-xl p-3 border bg-blue-50/50 border-blue-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-slate-800 truncate flex-1">
          {taskName}
        </span>
        <span className={`text-[10px] font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      <div className="text-[11px] text-slate-400 mb-1.5">
        #{job.id} · {job.current_step_index + 1}/{job.total_steps} 步
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
