const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
