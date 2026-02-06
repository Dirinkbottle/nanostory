import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { WorkflowJob } from '../../hooks/useWorkflow';

interface CompletedSectionProps {
  jobs: WorkflowJob[];
  getStatusColor: (status: string) => string;
}

const CompletedSection: React.FC<CompletedSectionProps> = ({ jobs, getStatusColor }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 py-1 w-full"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        已完成 ({jobs.length})
      </button>
      {expanded && (
        <div className="space-y-1.5 mt-1">
          {jobs.slice(0, 10).map(job => (
            <div key={job.id} className="rounded-lg p-2 bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 truncate">
                  {job.workflowName || job.workflow_type}
                </span>
                <span className={`text-[10px] font-semibold ${getStatusColor(job.status)}`}>
                  已完成
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                #{job.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletedSection;
