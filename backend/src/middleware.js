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

const ACTUAL_SECRET = JWT_SECRET || 'dev-temp-secret-' + Date.now();

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
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET: ACTUAL_SECRET
};
