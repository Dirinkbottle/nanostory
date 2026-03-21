import React from 'react';
import { X } from 'lucide-react';
import { getToastAppearance } from './toastTheme';
import type { ToastItemData } from './types';

interface NotificationViewportProps {
  toasts: ToastItemData[];
  onClose: (id: string) => void;
}

export const NotificationViewport: React.FC<NotificationViewportProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-slide-in-right">
          <NotificationToastItem toast={toast} onClose={() => onClose(toast.id)} />
        </div>
      ))}
    </div>
  );
};

const NotificationToastItem: React.FC<{ toast: ToastItemData; onClose: () => void }> = ({ toast, onClose }) => {
  const style = getToastAppearance(toast.type);

  return (
    <div
      className={`
        w-80 p-4
        bg-gradient-to-br ${style.bg}
        backdrop-blur-xl
        border ${style.border}
        rounded-xl
        shadow-lg ${style.glow}
        flex items-start gap-3
      `}
    >
      <div className="mt-0.5 shrink-0 animate-scale-in">{style.icon}</div>
      <div className="flex-1 mr-2">
        <p className="text-sm font-semibold text-[#e8e4dc] leading-snug break-words">{toast.message}</p>
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
