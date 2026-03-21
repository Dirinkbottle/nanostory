const { publishRequestNotification } = require('./notificationPublisher');

function mapStatusToMessageType(statusCode) {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'success';
}

function shouldNotifyFromResponse(req, res, payload) {
  if (res.locals?.skipAutoNotification) {
    return false;
  }

  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (typeof payload.message !== 'string' || !payload.message.trim()) {
    return false;
  }

  if (res.statusCode >= 400) {
    return true;
  }

  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
}

function notificationResponseMiddleware(req, res, next) {
  const rawHeader = req.headers['x-notification-session-id'];
  req.notificationSessionId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  const originalJson = res.json.bind(res);
  res.json = function jsonWithNotification(payload) {
    if (shouldNotifyFromResponse(req, res, payload)) {
      publishRequestNotification(
        req,
        {
          messageType: mapStatusToMessageType(res.statusCode || 200),
          message: payload.message.trim(),
          sourceEvent: `${req.method.toUpperCase()} ${req.path}`
        },
        { preferUser: false }
      ).catch((error) => {
        console.error('[Notification] Failed to publish response notification:', error.message);
      });
    }

    return originalJson(payload);
  };

  next();
}

module.exports = {
  notificationResponseMiddleware
};
