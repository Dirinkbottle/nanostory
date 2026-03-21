export type NotificationLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

export type ToastType = NotificationLevel | 'warning';

export interface NotificationMessage {
  id: number;
  level: NotificationLevel;
  title?: string | null;
  message: string;
  payload?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface ToastItemData {
  id: string;
  message: string;
  type: ToastType;
}
