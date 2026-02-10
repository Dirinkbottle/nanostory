import React, { useState } from 'react';
import { Spinner } from '@heroui/react';
import { X, RotateCcw, ListTodo } from 'lucide-react';
import { getAuthToken } from '../../services/auth';
import { useTaskQueue } from './useTaskQueue';
import TaskItem from './TaskItem';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return 'text-blue-400';
    case 'pending': return 'text-amber-400';
    case 'completed': return 'text-emerald-400';
    case 'failed': return 'text-red-400';
    case 'cancelled': return 'text-slate-500';
    default: return 'text-slate-400';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'running': return '运行中';
    case 'pending': return '等待中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    case 'cancelled': return '已取消';
    default: return status;
  }
};

const TaskQueueBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    jobs,
    loading,
    fetchJobs,
    getJobProgress,
  } = useTaskQueue();

  // 未登录不显示
  if (!getAuthToken()) return null;

  return (
    <>
      {/* 浮动小球 */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); fetchJobs(true); }}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-110 transition-all flex items-center justify-center"
          title="任务队列"
        >
          <ListTodo className="w-5 h-5" />
          {jobs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {jobs.length}
            </span>
          )}
        </button>
      )}

      {/* 展开面板 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[70vh] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/50 flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              <span className="font-semibold text-sm">任务队列</span>
              {jobs.length > 0 && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                  {jobs.length} 进行中
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="收起"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 任务列表 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading && jobs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
                <span className="ml-2 text-sm text-slate-500">加载中...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                暂无任务
              </div>
            ) : (
              <>
                {jobs.map(job => (
                  <TaskItem
                    key={job.id}
                    job={job}
                    progress={getJobProgress(job)}
                    statusColor={getStatusColor(job.status)}
                    statusLabel={getStatusLabel(job.status)}
                  />
                ))}
              </>
            )}
          </div>

          {/* 底部 */}
          <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              共 {jobs.length} 个任务
            </span>
            <button
              onClick={() => fetchJobs(true)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              刷新
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskQueueBubble;
