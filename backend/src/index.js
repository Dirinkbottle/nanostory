const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./auth');
const scriptRoutes = require('./scripts');
const storyboardRoutes = require('./storyboards');
const billingRoutes = require('./billing');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

app.use('/api/auth', authRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/storyboards', storyboardRoutes);
app.use('/api/billing', billingRoutes);

// Serve static files for production if needed
const clientBuildPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
