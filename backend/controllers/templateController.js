// backend/controllers/templateController.js

const { getDb }      = require('../../database/db');
const { fillTemplate, loadSettings } = require('../services/whatsappService');

exports.getAll = (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT * FROM templates ORDER BY is_default DESC, name').all();
  res.json({ success: true, data: rows });
};

exports.getOne = (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Template not found' });
  res.json({ success: true, data: row });
};

exports.create = (req, res) => {
  const db = getDb();
  const { name, body, is_default } = req.body;
  if (!name || !body)
    return res.status(400).json({ success: false, message: 'Name and body are required' });

  // Only one default at a time
  if (is_default) db.prepare("UPDATE templates SET is_default=0").run();

  try {
    const info = db.prepare(
      "INSERT INTO templates(name,body,is_default) VALUES(?,?,?)"
    ).run(name.trim(), body.trim(), is_default ? 1 : 0);
    const created = db.prepare('SELECT * FROM templates WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = (req, res) => {
  const db = getDb();
  const { name, body, is_default } = req.body;
  if (!name || !body)
    return res.status(400).json({ success: false, message: 'Name and body are required' });

  if (is_default) db.prepare("UPDATE templates SET is_default=0").run();

  const info = db.prepare(`
    UPDATE templates SET name=?,body=?,is_default=?,updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(name.trim(), body.trim(), is_default ? 1 : 0, req.params.id);

  if (info.changes === 0)
    return res.status(404).json({ success: false, message: 'Template not found' });
  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
};

exports.remove = (req, res) => {
  const db   = getDb();
  const info = db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ success: false, message: 'Template not found' });
  res.json({ success: true, message: 'Template deleted' });
};

// Preview template with sample data
exports.preview = (req, res) => {
  const { body, vars } = req.body;
  if (!body) return res.status(400).json({ success: false, message: 'Body is required' });
  const settings = loadSettings();
  const preview  = fillTemplate(body, {
    name:          vars?.name          || 'Sample Customer',
    occasion:      vars?.occasion      || 'Diwali',
    business_name: vars?.business_name || settings.business_name || 'My Business',
    discount:      vars?.discount      || settings.default_discount || '20% OFF',
    offer_expiry:  vars?.offer_expiry  || settings.default_expiry   || '3 days',
    custom_text:   vars?.custom_text   || '',
  });
  res.json({ success: true, data: { preview } });
};
