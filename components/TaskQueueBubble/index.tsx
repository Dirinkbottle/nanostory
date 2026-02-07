import React, { useState, useRef, useEffect } from 'react';
import { Spinner } from '@heroui/react';
import { X, ChevronDown, RotateCcw, ListTodo, GripVertical } from 'lucide-react';
import { getAuthToken } from '../../services/auth';
import { useTaskQueue } from './useTaskQueue';
import TaskItem from './TaskItem';

const POSITION_KEY = 'nanostory_task_bubble_position';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return 'text-blue-600';
    case 'pending': return 'text-amber-600';
    case 'completed': return 'text-emerald-600';
    case 'failed': return 'text-red-600';
    case 'cancelled': return 'text-slate-500';
    default: return 'text-slate-600';
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
  const [isHidden, setIsHidden] = useState(false);
  
  // 拖动状态
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: window.innerWidth - 80, y: window.innerHeight - 80 };
      }
    }
    return { x: window.innerWidth - 80, y: window.innerHeight - 80 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const {
    jobs,
    loading,
    fetchJobs,
    getJobProgress,
  } = useTaskQueue();

  // 保存位置到 localStorage
  useEffect(() => {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  }, [position]);

  // 拖动处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      
      const newX = Math.max(20, Math.min(window.innerWidth - 60, dragRef.current.initialX + deltaX));
      const newY = Math.max(20, Math.min(window.innerHeight - 60, dragRef.current.initialY + deltaY));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 计算面板位置（确保不超出屏幕）
  const getPanelStyle = () => {
    const panelWidth = 384; // w-96
    const panelHeight = 400;
    
    let left = position.x - panelWidth + 48;
    let top = position.y - panelHeight - 10;
    
    // 如果面板超出左边，改为向右展开
    if (left < 10) {
      left = position.x;
    }
    // 如果面板超出上边，改为向下展开
    if (top < 10) {
      top = position.y + 60;
    }
    
    return { left, top };
  };

  // 未登录不显示
  if (!getAuthToken()) return null;

  // 隐藏模式：只显示一个小点
  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 w-3 h-3 rounded-full bg-blue-500 opacity-50 hover:opacity-100 hover:w-4 hover:h-4 transition-all"
        title="显示任务队列"
      />
    );
  }

  return (
    <>
      {/* 浮动小球 - 可拖动 */}
      {!isOpen && (
        <div
          style={{ left: position.x, top: position.y }}
          className={`fixed z-50 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        >
          {/* 拖动区域 */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute inset-0 rounded-full"
          />
          {/* 点击展开 */}
          <button
            onClick={() => { if (!isDragging) { setIsOpen(true); fetchJobs(); } }}
            className="relative z-10 w-full h-full flex items-center justify-center"
            title="任务队列（拖动可移动位置）"
          >
            <ListTodo className="w-5 h-5" />
          </button>
          {jobs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {jobs.length}
            </span>
          )}
        </div>
      )}

      {/* 展开面板 */}
      {isOpen && (
        <div 
          style={getPanelStyle()}
          className="fixed z-50 w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        >
          {/* 头部 - 可拖动 */}
          <div 
            className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 opacity-60" />
              <ListTodo className="w-4 h-4" />
              <span className="font-semibold text-sm">任务队列</span>
              {jobs.length > 0 && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                  {jobs.length} 进行中
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsHidden(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="隐藏"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="收起"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
          <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              共 {jobs.length} 个任务
            </span>
            <button
              onClick={fetchJobs}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
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
