import React, { useState, useRef, useEffect } from 'react';
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

interface Position {
  x: number;
  y: number;
  side: 'left' | 'right';
}

const STORAGE_KEY = 'taskQueueBubblePosition';
const PANEL_STORAGE_KEY = 'taskQueuePanelPosition';
const MARGIN = 24; // 6 * 4px (tailwind's spacing unit)
const BUBBLE_SIZE = 48; // 12 * 4px

// 从本地存储加载位置
const loadPosition = (): Position => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load bubble position:', e);
  }
  return { x: window.innerWidth - MARGIN - BUBBLE_SIZE, y: window.innerHeight - MARGIN - BUBBLE_SIZE, side: 'right' };
};

// 保存位置到本地存储
const savePosition = (position: Position) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch (e) {
    console.error('Failed to save bubble position:', e);
  }
};

// 加载面板位置
const loadPanelPosition = (): { x: number; y: number } | null => {
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load panel position:', e);
  }
  return null;
};

// 保存面板位置
const savePanelPosition = (x: number, y: number) => {
  try {
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify({ x, y }));
  } catch (e) {
    console.error('Failed to save panel position:', e);
  }
};

const TaskQueueBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const clickStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // 面板拖动相关状态
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(loadPanelPosition);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const panelDragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    jobs,
    loading,
    fetchJobs,
    getJobProgress,
  } = useTaskQueue();

  // 未登录不显示
  if (!getAuthToken()) return null;

  // 处理拖动开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return; // 展开状态不允许拖动
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setIsAnimating(false);
    hasMoved.current = false;
    // 记录点击起始位置，用于判断是否为拖动
    clickStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  // 处理拖动中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    // 检测是否真的在移动
    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - clickStartPos.current.x, 2) + 
      Math.pow(e.clientY - clickStartPos.current.y, 2)
    );
    if (moveDistance > 3) {
      hasMoved.current = true;
    }
    
    // 让球心对准鼠标指针
    const newX = e.clientX - BUBBLE_SIZE / 2;
    const newY = e.clientY - BUBBLE_SIZE / 2;
    
    // 限制在屏幕范围内
    const maxX = window.innerWidth - BUBBLE_SIZE;
    const maxY = window.innerHeight - BUBBLE_SIZE;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
      side: position.side,
    });
  };

  // 处理拖动结束
  const handleMouseUp = () => {
    if (!isDragging) return;
    
    // 只有移动了才执行吸附
    if (hasMoved.current) {
      // 立即停止拖动状态，防止粘稠感
      setIsDragging(false);
      setIsAnimating(true);
      
      // 吸附到最近的边缘
      const screenCenterX = window.innerWidth / 2;
      const bubbleCenterX = position.x + BUBBLE_SIZE / 2;
      const side: 'left' | 'right' = bubbleCenterX < screenCenterX ? 'left' : 'right';
      
      // 计算吸附后的 x 坐标
      const snapX = side === 'left' ? MARGIN : window.innerWidth - MARGIN - BUBBLE_SIZE;
      
      const newPosition = {
        x: snapX,
        y: position.y,
        side,
      };
      
      // 立即更新位置
      setPosition(newPosition);
      savePosition(newPosition);
      
      // 动画结束后重置动画状态
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    } else {
      // 没有移动，直接重置
      setIsDragging(false);
    }
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  // 响应窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - BUBBLE_SIZE - MARGIN;
      const maxY = window.innerHeight - BUBBLE_SIZE - MARGIN;
      
      if (position.x > maxX || position.y > maxY) {
        const newPosition = {
          x: Math.min(position.x, maxX),
          y: Math.min(position.y, maxY),
          side: position.side,
        };
        setPosition(newPosition);
        savePosition(newPosition);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // 面板拖动处理
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    // 只在头部区域允许拖动
    const target = e.target as HTMLElement;
    if (!target.closest('.panel-header')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsPanelDragging(true);
    
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      panelDragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handlePanelMouseMove = (e: MouseEvent) => {
    if (!isPanelDragging || !panelRef.current) return;
    e.preventDefault();
    
    const panelWidth = 384; // w-96
    const panelHeight = panelRef.current.offsetHeight;
    
    let newX = e.clientX - panelDragOffset.current.x;
    let newY = e.clientY - panelDragOffset.current.y;
    
    // 限制在屏幕范围内
    newX = Math.max(0, Math.min(newX, window.innerWidth - panelWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - panelHeight));
    
    setPanelPosition({ x: newX, y: newY });
  };

  const handlePanelMouseUp = () => {
    if (!isPanelDragging) return;
    
    // 【无粘稠感】松手立即停止拖动状态
    setIsPanelDragging(false);
    
    // 立即保存位置（与拖动状态分离）
    if (panelPosition) {
      savePanelPosition(panelPosition.x, panelPosition.y);
    }
  };

  // 面板拖动事件监听
  useEffect(() => {
    if (isPanelDragging) {
      document.addEventListener('mousemove', handlePanelMouseMove);
      document.addEventListener('mouseup', handlePanelMouseUp);
      return () => {
        document.removeEventListener('mousemove', handlePanelMouseMove);
        document.removeEventListener('mouseup', handlePanelMouseUp);
      };
    }
  }, [isPanelDragging, panelPosition]);

  // 计算面板位置样式
  const getPanelStyle = (): React.CSSProperties => {
    // 如果有自定义位置，使用自定义位置
    if (panelPosition) {
      return {
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
        // 【无粘稠感】禁用过渡动画，确保拖动跟手
        transition: 'none',
        cursor: isPanelDragging ? 'grabbing' : 'default',
      };
    }
    
    // 否则根据任务球位置自动计算
    const panelWidth = 384; // w-96 = 24rem = 384px
    const gap = 12; // 3 * 4px
    const maxPanelHeight = Math.min(window.innerHeight * 0.7, 500);
    
    // 根据任务球位置决定面板方向
    if (position.side === 'left') {
      return {
        left: position.x + BUBBLE_SIZE + gap,
        top: Math.max(MARGIN, Math.min(position.y, window.innerHeight - maxPanelHeight - MARGIN)),
      };
    } else {
      return {
        right: window.innerWidth - position.x + gap,
        top: Math.max(MARGIN, Math.min(position.y, window.innerHeight - maxPanelHeight - MARGIN)),
      };
    }
  };

  return (
    <>
      {/* 浮动小球 */}
      {!isOpen && (
        <button
          ref={bubbleRef}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            e.stopPropagation();
            // 只有在没有移动的情况下才打开（点击而非拖动）
            if (!hasMoved.current && !isDragging) {
              setIsOpen(true);
              fetchJobs(true);
            }
          }}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isAnimating ? 'left 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
            transform: isDragging ? 'scale(1.15)' : 'scale(1)',
            opacity: isDragging ? 0.95 : 1,
            willChange: isDragging ? 'transform, left, top' : 'auto',
          }}
          className="fixed z-50 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-110 flex items-center justify-center"
          title="任务队列（可拖动）"
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
        <div 
          ref={panelRef}
          onMouseDown={handlePanelMouseDown}
          style={getPanelStyle()}
          className="fixed z-50 w-96 max-h-[70vh] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* 头部 */}
          <div className="panel-header flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white cursor-grab active:cursor-grabbing">
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
                    onCancelled={() => fetchJobs(false)}
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
