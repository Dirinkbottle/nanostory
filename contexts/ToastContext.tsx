import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto animate-slide-in-right">
            <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const styles = {
    success: {
      bg: 'from-emerald-500/20 to-green-500/10',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/20',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />
    },
    error: {
      bg: 'from-red-500/20 to-rose-500/10',
      border: 'border-red-500/40',
      glow: 'shadow-red-500/20',
      icon: <AlertCircle className="w-5 h-5 text-red-400" />
    },
    warning: {
      bg: 'from-amber-500/20 to-yellow-500/10',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/20',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
    },
    info: {
      bg: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-500/20',
      icon: <Info className="w-5 h-5 text-cyan-400" />
    }
  };

  const style = styles[toast.type];

  return (
    <div className={`
      w-80 p-4
      bg-gradient-to-br ${style.bg}
      backdrop-blur-xl
      border ${style.border}
      rounded-xl
      shadow-lg ${style.glow}
      flex items-start gap-3
    `}>
      <div className="mt-0.5 shrink-0 animate-scale-in">
        {style.icon}
      </div>
      <div className="flex-1 mr-2">
        <p className="text-sm font-semibold text-[#e8e4dc] leading-snug break-words">
          {toast.message}
        </p>
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 text-[#a8a29e] hover:text-[#e8e4dc] transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
