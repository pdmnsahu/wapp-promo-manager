// backend/controllers/settingsController.js

const { getDb } = require('../../database/db');
const { startScheduler } = require('../services/schedulerService');

exports.getAll = (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj  = {};
  rows.forEach(r => (obj[r.key] = r.value));
  res.json({ success: true, data: obj });
};

exports.update = (req, res) => {
  const db     = getDb();
  const fields = req.body; // { key: value, ... }

  // Sensitive keys that are allowed to be updated
  const allowed = [
    'business_name','business_phone','default_discount','default_expiry',
    'send_mode','api_provider','api_instance_id','api_token','api_endpoint',
    'scheduler_time','auto_send',
  ];

  const upsert = db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)");
  const upsertMany = db.transaction((obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (allowed.includes(k)) upsert.run(k, String(v));
    }
  });

  try {
    upsertMany(fields);

    // Restart scheduler if time changed
    if (fields.scheduler_time) startScheduler(fields.scheduler_time);

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj  = {};
    rows.forEach(r => (obj[r.key] = r.value));
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
