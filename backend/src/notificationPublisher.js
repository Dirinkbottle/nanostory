const INTERNAL_NOTIFICATION_PATH = '/internal/notifications';

function getNotificationServiceUrl() {
  return (process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4101').replace(/\/+$/, '');
}

function getServiceHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Service-Id': process.env.BACKEND_SERVICE_ID || 'backend',
    'X-Service-Secret': process.env.SERVICE_SHARED_SECRET || 'change-this-shared-secret'
  };
}

function getDefaultSourceService() {
  return process.env.BACKEND_SERVICE_ID || 'backend';
}

async function publishNotification(notification) {
  if (!notification?.message) {
    return null;
  }

  const response = await fetch(`${getNotificationServiceUrl()}${INTERNAL_NOTIFICATION_PATH}`, {
    method: 'POST',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      maxAttempts: 6,
      ...notification,
      sourceService: notification.sourceService || getDefaultSourceService()
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notification publish failed (${response.status}): ${text}`);
  }

  return response.json();
}

function getNotificationTargetForRequest(req, { preferUser = false } = {}) {
  const sessionId = req.notificationSessionId || '';
  const userId = req.user?.id || req.user?.userId || null;

  if (preferUser && userId) {
    return {
      scopeType: 'user',
      targetUserId: userId,
      targetSessionId: null
    };
  }

  if (sessionId) {
    return {
      scopeType: 'session',
      targetUserId: userId,
      targetSessionId: sessionId
    };
  }

  if (userId) {
    return {
      scopeType: 'user',
      targetUserId: userId,
      targetSessionId: null
    };
  }

  return null;
}

async function publishRequestNotification(req, payload, options = {}) {
  const target = getNotificationTargetForRequest(req, options);
  if (!target) {
    return null;
  }

  return publishNotification({
    ...target,
    ...payload
  });
}

module.exports = {
  publishNotification,
  publishRequestNotification,
  getNotificationTargetForRequest
};
