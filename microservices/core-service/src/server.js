require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');

const SERVICE_MODE = process.env.SERVICE_MODE || 'control-plane';
const SERVICE_SECRET = process.env.SERVICE_SHARED_SECRET || 'change-this-shared-secret';
const CONTROL_PORT = Number(process.env.CORE_SERVICE_CONTROL_PORT || 4100);
const AGENT_PORT = Number(process.env.CORE_SERVICE_AGENT_PORT || 4103);
const NODE_ID = process.env.NODE_ID || 'local-node';
const CONTROL_URL = (process.env.CORE_CONTROL_URL || 'http://core-service-control:4100').replace(/\/+$/, '');
const HEARTBEAT_TTL_MS = Number(process.env.CORE_SERVICE_HEARTBEAT_TTL_MS || 15000);
const DISCOVERY_INTERVAL_MS = Number(process.env.CORE_SERVICE_DISCOVERY_INTERVAL_MS || 5000);
const DOCKER_COMPOSE_PROJECT = process.env.DOCKER_COMPOSE_PROJECT || 'nanostory';
const AGENT_SERVICE_ID = process.env.CORE_AGENT_SERVICE_ID || 'core-service-agent';

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock'
});

const controlState = {
  services: new Map(),
  locks: new Map()
};

function verifyServiceRequest(req, res, next) {
  const serviceId = req.header('X-Service-Id');
  const serviceSecret = req.header('X-Service-Secret');

  if (!serviceId || !SERVICE_SECRET || serviceSecret !== SERVICE_SECRET) {
    return res.status(401).json({ message: 'Unauthorized service request' });
  }

  req.serviceId = serviceId;
  next();
}

function getPanelUrls() {
  return {
    notification: process.env.NOTIFICATION_PANEL_PUBLIC_URL || 'http://localhost:4101',
    core: process.env.CORE_SERVICE_PANEL_PUBLIC_URL || 'http://localhost:4102'
  };
}

function mapComposeService(composeService) {
  const panelUrls = getPanelUrls();

  switch (composeService) {
    case 'nginx':
      return { serviceId: 'frontend', name: 'Frontend', panelUrl: null };
    case 'backend':
      return { serviceId: 'backend', name: 'Backend', panelUrl: null };
    case 'minio':
      return { serviceId: 'minio', name: 'MinIO', panelUrl: null };
    case 'notification-service':
      return { serviceId: 'notification-service', name: 'Notification Service', panelUrl: panelUrls.notification };
    case 'core-service-control':
      return { serviceId: 'core-service', name: 'Core Service', panelUrl: panelUrls.core };
    default:
      return null;
  }
}

async function getContainerMetrics(containerInfo) {
  const container = docker.getContainer(containerInfo.Id);
  const inspect = await container.inspect();
  const stats = await container.stats({ stream: false });

  const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
  const systemDelta = (stats.cpu_stats?.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
  const cpuCount =
    stats.cpu_stats?.online_cpus ||
    stats.cpu_stats?.cpu_usage?.percpu_usage?.length ||
    1;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;
  const memoryUsage = stats.memory_stats?.usage || 0;
  const memoryLimit = stats.memory_stats?.limit || 0;
  const startedAt = inspect?.State?.StartedAt ? new Date(inspect.State.StartedAt) : null;
  const uptimeSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0;

  return {
    status: inspect?.State?.Running ? 'running' : inspect?.State?.Status || 'unknown',
    uptimeSeconds,
    metrics: {
      cpuPercent: Number(cpuPercent.toFixed(2)),
      memoryUsage,
      memoryLimit
    }
  };
}

function formatBytes(value) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let current = value;
  let index = 0;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function toServicePayload(service) {
  const stale = Date.now() - service.lastHeartbeatAt > HEARTBEAT_TTL_MS;
  return {
    ...service,
    status: stale ? 'unknown' : service.status,
    stale
  };
}

function renderControlPanel(services) {
  const cards = services.map((service) => `
    <div class="card">
      <div class="eyebrow">${service.nodeId}</div>
      <h3>${service.name}</h3>
      <div class="meta">状态: ${service.status}</div>
      <div class="meta">CPU: ${service.metrics?.cpuPercent ?? 0}%</div>
      <div class="meta">内存: ${formatBytes(service.metrics?.memoryUsage || 0)} / ${formatBytes(service.metrics?.memoryLimit || 0)}</div>
      <div class="meta">运行时间: ${service.uptimeSeconds || 0}s</div>
    </div>
  `).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Core Service</title>
  <style>
    body { margin: 0; background: #f7f7f8; color: #16181d; font-family: "Segoe UI", sans-serif; }
    .page { max-width: 1180px; margin: 0 auto; padding: 40px 24px 64px; }
    .hero, .card { background: #fff; border: 1px solid #ececf0; border-radius: 24px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06); }
    .hero { padding: 32px; }
    .cards { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .card { padding: 18px; }
    .eyebrow { color: #6c7480; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; }
    .meta { margin-top: 10px; color: #55606f; }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="eyebrow">control-plane</div>
      <h1>Core Service</h1>
      <p>聚合服务注册、状态、指标与生命周期控制。</p>
    </section>
    <section class="cards">${cards}</section>
  </div>
</body>
</html>`;
}

async function callAgentAction(agentBaseUrl, serviceId, action) {
  const response = await fetch(`${agentBaseUrl}/internal/agent/services/${encodeURIComponent(serviceId)}/actions/${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Id': 'core-service',
      'X-Service-Secret': SERVICE_SECRET
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
    const error = new Error(data?.message || 'Agent action failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function startControlPlane() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '200kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', serviceId: 'core-service', mode: SERVICE_MODE });
  });

  app.get('/', (_req, res) => {
    const services = Array.from(controlState.services.values())
      .map(toServicePayload)
      .sort((left, right) => left.name.localeCompare(right.name));
    res.type('html').send(renderControlPanel(services));
  });

  app.post('/internal/services/register', verifyServiceRequest, (req, res) => {
    const payload = req.body || {};
    if (!payload.serviceId || !payload.nodeId) {
      return res.status(400).json({ message: 'serviceId and nodeId are required' });
    }

    const existing = controlState.services.get(payload.serviceId) || {};
    controlState.services.set(payload.serviceId, {
      ...existing,
      ...payload,
      lastHeartbeatAt: Date.now()
    });

    res.json({ success: true, message: '服务注册成功' });
  });

  app.post('/internal/services/heartbeat', verifyServiceRequest, (req, res) => {
    const payload = req.body || {};
    const existing = controlState.services.get(payload.serviceId);

    if (!payload.serviceId) {
      return res.status(400).json({ message: 'serviceId is required' });
    }

    if (!existing) {
      return res.status(404).json({ message: '服务未注册' });
    }

    controlState.services.set(payload.serviceId, {
      ...existing,
      ...payload,
      lastHeartbeatAt: Date.now()
    });

    res.json({ success: true });
  });

  app.get('/internal/services', verifyServiceRequest, (_req, res) => {
    const services = Array.from(controlState.services.values())
      .map(toServicePayload)
      .sort((left, right) => left.name.localeCompare(right.name));

    res.json({ services });
  });

  app.post('/internal/services/:serviceId/actions/:action', verifyServiceRequest, async (req, res) => {
    const { serviceId, action } = req.params;
    const service = controlState.services.get(serviceId);

    if (!service) {
      return res.status(404).json({ message: '服务不存在' });
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ message: '不支持的操作' });
    }

    if (controlState.locks.has(serviceId)) {
      return res.status(409).json({ message: '该服务已有生命周期操作正在执行' });
    }

    if (!service.agentBaseUrl || !service.controllable) {
      return res.status(400).json({ message: '该服务当前不可控' });
    }

    controlState.locks.set(serviceId, { action, startedAt: Date.now() });
    try {
      const result = await callAgentAction(service.agentBaseUrl, serviceId, action);
      res.json({
        success: true,
        message: result?.message || '服务操作已执行',
        serviceId,
        action
      });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || '服务操作失败' });
    } finally {
      controlState.locks.delete(serviceId);
    }
  });

  app.listen(CONTROL_PORT, () => {
    console.log(`[Core] control-plane listening on http://localhost:${CONTROL_PORT}`);
  });
}

async function discoverServices() {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`com.docker.compose.project=${DOCKER_COMPOSE_PROJECT}`]
    }
  });

  const services = [];

  for (const containerInfo of containers) {
    const composeService = containerInfo.Labels?.['com.docker.compose.service'];
    const mapping = mapComposeService(composeService);
    if (!mapping) {
      continue;
    }

    const { status, uptimeSeconds, metrics } = await getContainerMetrics(containerInfo);
    services.push({
      serviceId: mapping.serviceId,
      name: mapping.name,
      nodeId: NODE_ID,
      panelUrl: mapping.panelUrl,
      status,
      uptimeSeconds,
      metrics,
      controllable: true,
      capabilities: ['start', 'stop', 'restart'],
      metadata: {
        composeService,
        containerId: containerInfo.Id,
        containerName: containerInfo.Names?.[0] || composeService
      },
      agentBaseUrl: `http://core-service-agent:${AGENT_PORT}`
    });
  }

  return services;
}

async function postToControl(path, body) {
  const response = await fetch(`${CONTROL_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Id': AGENT_SERVICE_ID,
      'X-Service-Secret': SERVICE_SECRET
    },
    body: JSON.stringify(body)
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
    const error = new Error(data?.message || 'Control-plane request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function syncServicesWithControl() {
  const services = await discoverServices();
  for (const service of services) {
    try {
      await postToControl('/internal/services/register', service);
    } catch (error) {
      if (error.status !== 409) {
        throw error;
      }
    }

    try {
      await postToControl('/internal/services/heartbeat', service);
    } catch (error) {
      if (error.status === 404) {
        await postToControl('/internal/services/register', service);
      } else {
        throw error;
      }
    }
  }
}

function renderAgentPanel() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Core Service Agent</title>
  <style>
    body { margin: 0; background: #f7f7f8; color: #16181d; font-family: "Segoe UI", sans-serif; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 24px 64px; }
    .card { background: #fff; border: 1px solid #ececf0; border-radius: 24px; padding: 28px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06); }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1>Core Service Agent</h1>
      <p>节点 ${NODE_ID} 的 Docker 服务发现与生命周期控制代理。</p>
    </div>
  </div>
</body>
</html>`;
}

async function handleAgentAction(serviceId, action) {
  const services = await discoverServices();
  const service = services.find((item) => item.serviceId === serviceId);

  if (!service) {
    const error = new Error('服务不存在');
    error.status = 404;
    throw error;
  }

  const containerId = service.metadata?.containerId;
  const container = docker.getContainer(containerId);

  if (action === 'start') {
    await container.start().catch((error) => {
      if (!String(error.message || '').includes('already started') && !String(error.message || '').includes('is already running')) {
        throw error;
      }
    });
  } else if (action === 'stop') {
    await container.stop().catch((error) => {
      if (!String(error.message || '').includes('is not running')) {
        throw error;
      }
    });
  } else if (action === 'restart') {
    await container.restart();
  } else {
    const error = new Error('不支持的操作');
    error.status = 400;
    throw error;
  }

  return {
    success: true,
    message: `服务 ${service.name} 已执行 ${action}`,
    serviceId,
    action
  };
}

async function startAgent() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    const services = await discoverServices();
    res.json({
      status: 'ok',
      serviceId: AGENT_SERVICE_ID,
      nodeId: NODE_ID,
      discoveredServices: services.length
    });
  });

  app.get('/', (_req, res) => {
    res.type('html').send(renderAgentPanel());
  });

  app.post('/internal/agent/services/:serviceId/actions/:action', verifyServiceRequest, async (req, res) => {
    try {
      const result = await handleAgentAction(req.params.serviceId, req.params.action);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || '服务操作失败' });
    }
  });

  app.listen(AGENT_PORT, () => {
    console.log(`[Core] agent listening on http://localhost:${AGENT_PORT}`);
  });

  await syncServicesWithControl().catch((error) => {
    console.error('[Core] Initial service sync failed:', error);
  });

  setInterval(() => {
    syncServicesWithControl().catch((error) => {
      console.error('[Core] Service sync failed:', error);
    });
  }, DISCOVERY_INTERVAL_MS);
}

if (SERVICE_MODE === 'agent') {
  startAgent().catch((error) => {
    console.error('[Core] Failed to start agent:', error);
    process.exit(1);
  });
} else {
  startControlPlane().catch((error) => {
    console.error('[Core] Failed to start control-plane:', error);
    process.exit(1);
  });
}
