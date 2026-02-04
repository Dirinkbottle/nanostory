const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, execute, getLastInsertId } = require('./dbHelper');
const { JWT_SECRET } = require('./middleware');

const router = express.Router();

// 密码强度验证
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, message: '密码至少需要 6 个字符' };
  }
  if (password.length > 128) {
    return { valid: false, message: '密码过长' };
  }
  // 可选：要求包含数字、大小写字母等
  // const hasNumber = /\d/.test(password);
  // const hasLetter = /[a-zA-Z]/.test(password);
  // if (!hasNumber || !hasLetter) {
  //   return { valid: false, message: '密码需要包含字母和数字' };
  // }
  return { valid: true };
}

// 用户名验证
function validateUsername(username) {
  if (!username || username.length < 3) {
    return { valid: false, message: '用户名至少需要 3 个字符' };
  }
  if (username.length > 20) {
    return { valid: false, message: '用户名最多 20 个字符' };
  }
  // 只允许字母、数字、下划线
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: '用户名只能包含字母、数字和下划线' };
  }
  return { valid: true };
}

router.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // 兼容旧的 email 参数名，实际存储为 username
  const username = String(email).trim();

  // 验证用户名格式
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ message: usernameValidation.message });
  }

  // 验证密码强度
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  try {
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [username]);

    if (existing) {
      return res.status(409).json({ message: '用户名已被注册' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', [username, passwordHash]);
    const userId = getLastInsertId();

    const token = jwt.sign({ userId, email: username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: userId, email: username }
    });
  } catch (err) {
    console.error('DB error in register:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // 兼容旧的 email 参数名，实际查询 username
  const username = String(email).trim();

  try {
    const row = queryOne('SELECT id, password_hash FROM users WHERE email = ?', [username]);

    if (!row) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, row.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: row.id, email: username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: row.id, email: username }
    });
  } catch (err) {
    console.error('DB error in login:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
