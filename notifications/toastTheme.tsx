import React from 'react';
import { AlertCircle, AlertTriangle, Bug, CheckCircle, Info } from 'lucide-react';
import type { ToastType } from './types';

export function normalizeToastType(type: ToastType): 'debug' | 'info' | 'success' | 'warn' | 'error' {
  if (type === 'warning') return 'warn';
  return type;
}

export function getToastAppearance(type: ToastType) {
  switch (normalizeToastType(type)) {
    case 'success':
      return {
        bg: 'from-emerald-500/20 to-green-500/10',
        border: 'border-emerald-500/40',
        glow: 'shadow-emerald-500/20',
        icon: <CheckCircle className="w-5 h-5 text-emerald-400" />
      };
    case 'error':
      return {
        bg: 'from-red-500/20 to-rose-500/10',
        border: 'border-red-500/40',
        glow: 'shadow-red-500/20',
        icon: <AlertCircle className="w-5 h-5 text-red-400" />
      };
    case 'warn':
      return {
        bg: 'from-amber-500/20 to-yellow-500/10',
        border: 'border-amber-500/40',
        glow: 'shadow-amber-500/20',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
      };
    case 'debug':
      return {
        bg: 'from-slate-500/20 to-slate-400/10',
        border: 'border-slate-400/40',
        glow: 'shadow-slate-500/20',
        icon: <Bug className="w-5 h-5 text-slate-300" />
      };
    case 'info':
    default:
      return {
        bg: 'from-blue-500/20 to-cyan-500/10',
        border: 'border-cyan-500/40',
        glow: 'shadow-cyan-500/20',
        icon: <Info className="w-5 h-5 text-cyan-400" />
      };
  }
}
