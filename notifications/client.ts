import { io, type Socket } from 'socket.io-client';
import type { NotificationMessage } from './types';

type NotificationListener = (message: NotificationMessage) => void;
type SessionListener = (sessionId: string | null) => void;

let socket: Socket | null = null;
let currentToken: string | null = null;
let currentSessionId: string | null = null;
const notificationListeners = new Set<NotificationListener>();
const sessionListeners = new Set<SessionListener>();

function getSocketUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost';
  }
  return window.location.origin;
}

function notifySessionListeners() {
  sessionListeners.forEach((listener) => listener(currentSessionId));
}

function ensureSocket() {
  if (socket) {
    return socket;
  }

  socket = io(getSocketUrl(), {
    path: '/notification/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: false,
    auth: {
      token: currentToken
    }
  });

  socket.on('connect', () => {
    if (currentToken) {
      socket?.emit('notification:auth', { token: currentToken });
    }
  });

  socket.on('disconnect', () => {
    currentSessionId = null;
    notifySessionListeners();
  });

  socket.on('notification:hello', (payload: { sessionId?: string }) => {
    currentSessionId = payload?.sessionId || null;
    notifySessionListeners();
  });

  socket.on('notification:deliver', (payload: NotificationMessage) => {
    notificationListeners.forEach((listener) => listener(payload));
  });

  return socket;
}

export function connectNotificationClient(token: string | null) {
  currentToken = token;
  const client = ensureSocket();
  client.auth = { token: currentToken };

  if (!client.connected) {
    client.connect();
  } else {
    client.emit('notification:auth', { token: currentToken });
  }
}

export function disconnectNotificationClient() {
  if (!socket) return;
  socket.disconnect();
}

export function setNotificationAuthToken(token: string | null) {
  currentToken = token;
  if (!socket) return;
  socket.auth = { token: currentToken };
  if (socket.connected) {
    socket.emit('notification:auth', { token: currentToken });
  }
}

export function onNotification(listener: NotificationListener) {
  notificationListeners.add(listener);
  return () => {
    notificationListeners.delete(listener);
  };
}

export function onNotificationSessionChange(listener: SessionListener) {
  sessionListeners.add(listener);
  listener(currentSessionId);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function acknowledgeNotification(notificationId: number) {
  socket?.emit('notification:ack', { notificationId });
}

export function getNotificationSessionId() {
  return currentSessionId;
}
