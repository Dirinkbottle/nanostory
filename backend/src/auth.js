const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../src/db');
const { JWT_SECRET } = require('../src/middleware');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();

  db.get('SELECT id FROM users WHERE email = ?', [trimmedEmail], (err, existing) => {
    if (err) {
      console.error('DB error in register:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    db.run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [trimmedEmail, passwordHash],
      function (insertErr) {
        if (insertErr) {
          console.error('DB insert error in register:', insertErr);
          return res.status(500).json({ message: 'Failed to create user' });
        }

        const userId = this.lastID;
        const token = jwt.sign({ userId, email: trimmedEmail }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
          token,
          user: { id: userId, email: trimmedEmail }
        });
      }
    );
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();

  db.get('SELECT id, password_hash FROM users WHERE email = ?', [trimmedEmail], (err, row) => {
    if (err) {
      console.error('DB error in login:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!row) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, row.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: row.id, email: trimmedEmail }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: row.id, email: trimmedEmail }
    });
  });
});

module.exports = router;
