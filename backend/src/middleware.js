const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 强制要求 JWT_SECRET 环境变量，防止使用默认值
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'dev-secret-change-me') {
  console.error('❌ SECURITY ERROR: JWT_SECRET environment variable is required!');
  console.error('💡 Set it in production: export JWT_SECRET="your-random-secret-key"');
  console.error('⚠️  Using temporary secret for development only...');
  // 开发环境临时使用，但会警告
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production!');
  }
}

const ACTUAL_SECRET = JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
const ADMIN_ACCESS_KEY_HEADER = 'x-admin-access-key';

function getConfiguredAdminAccessKey() {
  return typeof process.env.ADMIN_ACCESS_KEY === 'string'
    ? process.env.ADMIN_ACCESS_KEY.trim()
    : '';
}

function getAdminAccessKeyFromRequest(req) {
  const headerValue = req.headers?.[ADMIN_ACCESS_KEY_HEADER];
  const providedHeaderKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof providedHeaderKey === 'string' && providedHeaderKey.trim()) {
    return providedHeaderKey.trim();
  }

  const bodyKey = req.body?.adminAccessKey;
  if (typeof bodyKey === 'string' && bodyKey.trim()) {
    return bodyKey.trim();
  }

  return '';
}

function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateAdminAccessRequest(req) {
  const configuredKey = getConfiguredAdminAccessKey();
  if (!configuredKey) {
    return {
      ok: false,
      reason: 'unconfigured',
      status: 503,
      message: '管理员访问策略未配置，请设置 ADMIN_ACCESS_KEY'
    };
  }

  const providedKey = getAdminAccessKeyFromRequest(req);
  if (!providedKey) {
    return {
      ok: false,
      reason: 'missing',
      status: 403,
      message: '缺少后台访问密钥'
    };
  }

  if (!timingSafeStringEqual(providedKey, configuredKey)) {
    return {
      ok: false,
      reason: 'invalid',
      status: 403,
      message: '后台访问密钥无效'
    };
  }

  return { ok: true };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, ACTUAL_SECRET);
    req.user = { 
      userId: payload.userId, 
      id: payload.userId,
      email: payload.email,
      role: payload.role || 'user'
    };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '权限不足，仅管理员可访问' });
  }

  const accessCheck = validateAdminAccessRequest(req);
  if (!accessCheck.ok) {
    return res.status(accessCheck.status).json({ message: accessCheck.message });
  }

  next();
}

module.exports = {
  authMiddleware,
  requireAdmin,
  validateAdminAccessRequest,
  ADMIN_ACCESS_KEY_HEADER,
  JWT_SECRET: ACTUAL_SECRET
};
