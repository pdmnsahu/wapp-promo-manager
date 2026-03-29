// server.js — Entry point for WhatsApp Promo Manager

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

const { initializeDatabase } = require('./database/db');
const { startScheduler }     = require('./backend/services/schedulerService');

// ── Initialize DB before anything else ────────────────────────────────────
initializeDatabase();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for local use
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve static frontend ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/customers',  require('./backend/routes/customers'));
app.use('/api/occasions',  require('./backend/routes/occasions'));
app.use('/api/templates',  require('./backend/routes/templates'));
app.use('/api/settings',   require('./backend/routes/settings'));
app.use('/api/messages',   require('./backend/routes/messages'));

// ── Catch-all: serve index.html for SPA navigation ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  WhatsApp Promo Manager running at http://localhost:${PORT}\n`);

  // Start cron scheduler with saved time
  const { getDb } = require('./database/db');
  const db = getDb();
  const timeSetting = db.prepare("SELECT value FROM settings WHERE key='scheduler_time'").get();
  startScheduler(timeSetting?.value || '09:00');
});
