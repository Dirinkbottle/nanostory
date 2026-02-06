import React from 'react';
import { Progress } from '@heroui/react';
import { WorkflowJob } from '../../hooks/useWorkflow';

interface TaskItemProps {
  job: WorkflowJob;
  progress: number;
  statusColor: string;
  statusLabel: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ job, progress, statusColor, statusLabel }) => {
  return (
    <div className="rounded-xl p-3 border bg-blue-50/50 border-blue-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-slate-800 truncate flex-1">
          {job.workflowName || job.workflow_type}
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
