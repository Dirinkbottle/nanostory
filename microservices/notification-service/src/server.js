require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');

const PORT = Number(process.env.NOTIFICATION_SERVICE_PORT || 4101);
const SERVICE_ID = process.env.NOTIFICATION_SERVICE_ID || 'notification-service';
const SERVICE_SECRET = process.env.SERVICE_SHARED_SECRET || 'change-this-shared-secret';
const JWT_SECRET = process.env.JWT_SECRET || '';
const DISPATCH_BATCH_SIZE = Number(process.env.NOTIFICATION_DISPATCH_BATCH_SIZE || 100);
const MAX_IN_FLIGHT_PER_SESSION = Number(process.env.NOTIFICATION_MAX_IN_FLIGHT_PER_SESSION || 3);
const LEASE_SECONDS = Number(process.env.NOTIFICATION_LEASE_SECONDS || 15);

const socketsBySessionId = new Map();
const userSessions = new Map();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'nanostory',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
});

async function ensureNotificationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      scope_type ENUM('user', 'session', 'broadcast') NOT NULL,
      target_user_id INT DEFAULT NULL,
      target_session_id VARCHAR(128) DEFAULT NULL,
      message_type ENUM('info', 'debug', 'success', 'warn', 'error') NOT NULL,
      title VARCHAR(255) DEFAULT NULL,
      message TEXT NOT NULL,
      payload_json JSON DEFAULT NULL,
      source_service VARCHAR(100) NOT NULL,
      source_event VARCHAR(255) DEFAULT NULL,
      status ENUM('pending', 'delivering', 'acked', 'dead') NOT NULL DEFAULT 'pending',
      attempt_count INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 6,
      lease_until DATETIME DEFAULT NULL,
      available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      acked_at DATETIME DEFAULT NULL,
      dedupe_key VARCHAR(255) DEFAULT NULL,
      broadcast_batch_id VARCHAR(128) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notifications_status_available (status, available_at),
      INDEX idx_notifications_user_status (target_user_id, status, available_at),
      INDEX idx_notifications_session_status (target_session_id, status, available_at),
      INDEX idx_notifications_lease_until (lease_until),
      INDEX idx_notifications_broadcast_batch (broadcast_batch_id),
      INDEX idx_notifications_dedupe (dedupe_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function verifyServiceRequest(req, res, next) {
  const serviceId = req.header('X-Service-Id');
  const serviceSecret = req.header('X-Service-Secret');

  if (!serviceId || !SERVICE_SECRET || serviceSecret !== SERVICE_SECRET) {
    return res.status(401).json({ message: 'Unauthorized service request' });
  }

  req.serviceId = serviceId;
  next();
}

function getUserFromToken(token) {
  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role || 'user'
    };
  } catch {
    return null;
  }
}

function attachSocketUser(socket, user) {
  const previousUserId = socket.data.userId;
  if (previousUserId && userSessions.has(previousUserId)) {
    userSessions.get(previousUserId).delete(socket.data.sessionId);
    if (userSessions.get(previousUserId).size === 0) {
      userSessions.delete(previousUserId);
    }
  }

  socket.data.userId = user?.id || null;
  if (socket.data.userId) {
    if (!userSessions.has(socket.data.userId)) {
      userSessions.set(socket.data.userId, new Set());
    }
    userSessions.get(socket.data.userId).add(socket.data.sessionId);
  }
}

function getSocketInFlightCount(socket) {
  if (!socket.data.inFlight) {
    socket.data.inFlight = new Set();
  }
  return socket.data.inFlight.size;
}

function getSocketForUser(userId) {
  const sessionIds = userSessions.get(userId);
  if (!sessionIds || sessionIds.size === 0) {
    return null;
  }

  for (const sessionId of sessionIds) {
    const socket = socketsBySessionId.get(sessionId);
    if (socket && getSocketInFlightCount(socket) < MAX_IN_FLIGHT_PER_SESSION) {
      return socket;
    }
  }

  return null;
}

function getSocketForNotification(row) {
  if (row.target_session_id) {
    const socket = socketsBySessionId.get(row.target_session_id);
    if (socket && getSocketInFlightCount(socket) < MAX_IN_FLIGHT_PER_SESSION) {
      return socket;
    }
    return null;
  }

  if (row.target_user_id) {
    return getSocketForUser(row.target_user_id);
  }

  return null;
}

async function markDeadNotifications() {
  await pool.query(
    `UPDATE notifications
     SET status = 'dead', updated_at = UTC_TIMESTAMP()
     WHERE status IN ('pending', 'delivering')
       AND attempt_count >= max_attempts
       AND (lease_until IS NULL OR lease_until <= UTC_TIMESTAMP())`
  );
}

async function claimNotification(notificationId) {
  const [result] = await pool.query(
    `UPDATE notifications
     SET status = 'delivering',
         attempt_count = attempt_count + 1,
         lease_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND),
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND status IN ('pending', 'delivering')
       AND available_at <= UTC_TIMESTAMP()
       AND (lease_until IS NULL OR lease_until <= UTC_TIMESTAMP())
       AND attempt_count < max_attempts`,
    [LEASE_SECONDS, notificationId]
  );

  return result.affectedRows > 0;
}

async function fetchCandidateNotifications() {
  const [rows] = await pool.query(
    `SELECT id, scope_type, target_user_id, target_session_id, message_type, title, message,
            payload_json, source_service, source_event, created_at
     FROM notifications
     WHERE status IN ('pending', 'delivering')
       AND available_at <= UTC_TIMESTAMP()
       AND attempt_count < max_attempts
       AND (lease_until IS NULL OR lease_until <= UTC_TIMESTAMP())
     ORDER BY created_at ASC
     LIMIT ?`,
    [DISPATCH_BATCH_SIZE]
  );

  return rows;
}

function parsePayloadJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function dispatchNotifications() {
  await markDeadNotifications();
  const candidates = await fetchCandidateNotifications();

  for (const row of candidates) {
    const socket = getSocketForNotification(row);
    if (!socket) {
      continue;
    }

    const claimed = await claimNotification(row.id);
    if (!claimed) {
      continue;
    }

    if (!socket.data.inFlight) {
      socket.data.inFlight = new Set();
    }
    socket.data.inFlight.add(row.id);

    socket.emit('notification:deliver', {
      id: row.id,
      level: row.message_type,
      title: row.title,
      message: row.message,
      payload: parsePayloadJson(row.payload_json),
      createdAt: row.created_at
    });
  }
}

async function acknowledgeNotification(notificationId) {
  await pool.query(
    `UPDATE notifications
     SET status = 'acked',
         acked_at = UTC_TIMESTAMP(),
         lease_until = NULL,
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND status = 'delivering'`,
    [notificationId]
  );
}

async function createNotificationRows(payload) {
  const {
    scopeType,
    targetUserId = null,
    targetSessionId = null,
    messageType,
    title = null,
    message,
    payload: notificationPayload = null,
    sourceService,
    sourceEvent = null,
    dedupeKey = null,
    maxAttempts = 6
  } = payload;

  if (!scopeType || !messageType || !message || !sourceService) {
    throw new Error('Missing required notification fields');
  }

  if (!['user', 'session', 'broadcast'].includes(scopeType)) {
    throw new Error('Invalid scopeType');
  }

  if (!['info', 'debug', 'success', 'warn', 'error'].includes(messageType)) {
    throw new Error('Invalid messageType');
  }

  if (scopeType === 'broadcast') {
    const [users] = await pool.query('SELECT id FROM users ORDER BY id ASC');
    const broadcastBatchId = crypto.randomUUID();

    if (!users.length) {
      return { created: 0, broadcastBatchId };
    }

    const values = users.map((user) => [
      'broadcast',
      user.id,
      null,
      messageType,
      title,
      message,
      notificationPayload ? JSON.stringify(notificationPayload) : null,
      sourceService,
      sourceEvent,
      'pending',
      0,
      maxAttempts,
      null,
      dedupeKey,
      broadcastBatchId
    ]);

    await pool.query(
      `INSERT INTO notifications
       (scope_type, target_user_id, target_session_id, message_type, title, message, payload_json,
        source_service, source_event, status, attempt_count, max_attempts, lease_until, dedupe_key, broadcast_batch_id)
       VALUES ?`,
      [values]
    );

    return { created: users.length, broadcastBatchId };
  }

  await pool.query(
    `INSERT INTO notifications
     (scope_type, target_user_id, target_session_id, message_type, title, message, payload_json,
      source_service, source_event, status, attempt_count, max_attempts, lease_until, dedupe_key, broadcast_batch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL, ?, NULL)`,
    [
      scopeType,
      targetUserId,
      scopeType === 'session' ? targetSessionId : null,
      messageType,
      title,
      message,
      notificationPayload ? JSON.stringify(notificationPayload) : null,
      sourceService,
      sourceEvent,
      maxAttempts,
      dedupeKey
    ]
  );

  return { created: 1, broadcastBatchId: null };
}

async function getQueueStats() {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM notifications
     GROUP BY status`
  );

  const counts = {
    pending: 0,
    delivering: 0,
    acked: 0,
    dead: 0
  };

  rows.forEach((row) => {
    counts[row.status] = row.count;
  });

  return counts;
}

function renderPanel(stats) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Notification Service</title>
  <style>
    body { margin: 0; font-family: "Segoe UI", sans-serif; background: #f7f7f8; color: #16181d; }
    .page { max-width: 1100px; margin: 0 auto; padding: 40px 24px 64px; }
    .hero { background: #fff; border: 1px solid #e7e7ea; border-radius: 24px; padding: 32px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06); }
    .kpis { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #ececf0; border-radius: 18px; padding: 18px; }
    .label { color: #6c7480; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .value { margin-top: 10px; font-size: 32px; font-weight: 700; }
    .meta { margin-top: 8px; color: #6c7480; font-size: 14px; }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="label">${SERVICE_ID}</div>
      <h1>Notification Service</h1>
      <p>持久化通知队列、Socket 推送、ACK 重试。</p>
      <div class="meta">端口: ${PORT} · socket path: /notification/socket.io</div>
    </section>
    <section class="kpis">
      <div class="card"><div class="label">Pending</div><div class="value">${stats.pending}</div></div>
      <div class="card"><div class="label">Delivering</div><div class="value">${stats.delivering}</div></div>
      <div class="card"><div class="label">Acked</div><div class="value">${stats.acked}</div></div>
      <div class="card"><div class="label">Dead</div><div class="value">${stats.dead}</div></div>
    </section>
  </div>
</body>
</html>`;
}

async function start() {
  await ensureNotificationTable();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '200kb' }));

  app.get('/health', async (_req, res) => {
    const stats = await getQueueStats();
    res.json({
      status: 'ok',
      serviceId: SERVICE_ID,
      stats
    });
  });

  app.get('/', async (_req, res) => {
    const stats = await getQueueStats();
    res.type('html').send(renderPanel(stats));
  });

  app.post('/internal/notifications', verifyServiceRequest, async (req, res) => {
    try {
      const result = await createNotificationRows(req.body || {});
      res.json({
        success: true,
        created: result.created,
        broadcastBatchId: result.broadcastBatchId
      });
    } catch (error) {
      console.error('[Notification] Create notification failed:', error);
      res.status(400).json({ message: error.message || 'Create notification failed' });
    }
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    path: '/notification/socket.io',
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    const sessionId = crypto.randomUUID();
    socket.data.sessionId = sessionId;
    socket.data.inFlight = new Set();
    socketsBySessionId.set(sessionId, socket);

    const initialUser = getUserFromToken(socket.handshake.auth?.token);
    attachSocketUser(socket, initialUser);

    socket.emit('notification:hello', { sessionId });

    socket.on('notification:auth', ({ token }) => {
      const user = getUserFromToken(token);
      attachSocketUser(socket, user);
    });

    socket.on('notification:ack', async ({ notificationId }) => {
      if (!notificationId) return;
      socket.data.inFlight.delete(notificationId);
      await acknowledgeNotification(notificationId);
    });

    socket.on('disconnect', () => {
      socketsBySessionId.delete(sessionId);
      attachSocketUser(socket, null);
    });
  });

  setInterval(() => {
    dispatchNotifications().catch((error) => {
      console.error('[Notification] Dispatch loop failed:', error);
    });
  }, 1500);

  setInterval(() => {
    markDeadNotifications().catch((error) => {
      console.error('[Notification] Dead-letter sweep failed:', error);
    });
  }, 5000);

  server.listen(PORT, () => {
    console.log(`[Notification] Service listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('[Notification] Failed to start:', error);
  process.exit(1);
});
