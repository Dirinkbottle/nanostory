import React, { createContext, useContext, useEffect } from 'react';
import { useToast } from './ToastContext';
import {
  acknowledgeNotification,
  connectNotificationClient,
  disconnectNotificationClient,
  onNotification
} from '../notifications/client';
import { installNotificationFetchInterceptor } from '../notifications/fetchInterceptor';
import { hasSeenNotification, markNotificationSeen } from '../notifications/store';
import { getAuthToken } from '../services/auth';

const NotificationContext = createContext(true);

export const useNotificationBridge = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  useEffect(() => {
    installNotificationFetchInterceptor();
    connectNotificationClient(getAuthToken());

    const unsubscribe = onNotification((message) => {
      if (!message?.id || hasSeenNotification(message.id)) {
        return;
      }

      markNotificationSeen(message.id);
      const content = [message.title, message.message].filter(Boolean).join(' - ');
      showToast(content || '收到新通知', message.level);
      acknowledgeNotification(message.id);
    });

    return () => {
      unsubscribe();
      disconnectNotificationClient();
    };
  }, [showToast]);

  return <NotificationContext.Provider value={true}>{children}</NotificationContext.Provider>;
};
