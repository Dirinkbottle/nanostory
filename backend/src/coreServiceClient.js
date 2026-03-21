function getCoreServiceUrl() {
  return (process.env.CORE_SERVICE_URL || 'http://core-service-control:4100').replace(/\/+$/, '');
}

function getServiceHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Service-Id': process.env.BACKEND_SERVICE_ID || 'backend',
    'X-Service-Secret': process.env.SERVICE_SHARED_SECRET || 'change-this-shared-secret'
  };
}

async function requestCoreService(path, init = {}) {
  const response = await fetch(`${getCoreServiceUrl()}${path}`, {
    ...init,
    headers: {
      ...getServiceHeaders(),
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Core service request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function listServices() {
  return requestCoreService('/internal/services');
}

async function runServiceAction(serviceId, action) {
  return requestCoreService(`/internal/services/${encodeURIComponent(serviceId)}/actions/${encodeURIComponent(action)}`, {
    method: 'POST'
  });
}

module.exports = {
  listServices,
  runServiceAction
};
