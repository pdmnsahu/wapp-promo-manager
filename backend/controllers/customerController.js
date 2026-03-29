// backend/controllers/customerController.js

const { getDb } = require('../../database/db');

// Sanitize phone: keep digits and leading +
function sanitizePhone(p) {
  return (p || '').replace(/[^\d+]/g, '').trim();
}

exports.getAll = (req, res) => {
  const db = getDb();
  const { search, category, consented } = req.query;
  let sql  = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (consented !== undefined && consented !== '') {
    sql += ' AND consented = ?'; params.push(parseInt(consented));
  }
  sql += ' ORDER BY created_at DESC';

  try {
    const rows = db.prepare(sql).all(...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
  res.json({ success: true, data: row });
};

exports.create = (req, res) => {
  const db = getDb();
  const { full_name, phone, email, gender, address, notes, category, consented } = req.body;

  if (!full_name || !full_name.trim())
    return res.status(400).json({ success: false, message: 'Full name is required' });

  const cleanPhone = sanitizePhone(phone);
  if (!cleanPhone)
    return res.status(400).json({ success: false, message: 'Valid phone number is required' });

  try {
    const stmt = db.prepare(`
      INSERT INTO customers(full_name,phone,email,gender,address,notes,category,consented)
      VALUES(?,?,?,?,?,?,?,?)
    `);
    const info = stmt.run(
      full_name.trim(), cleanPhone,
      email || '', gender || '', address || '',
      notes || '', category || 'general',
      consented ? 1 : 0
    );
    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'Phone number already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = (req, res) => {
  const db = getDb();
  const { full_name, phone, email, gender, address, notes, category, consented } = req.body;

  if (!full_name || !full_name.trim())
    return res.status(400).json({ success: false, message: 'Full name is required' });

  const cleanPhone = sanitizePhone(phone);
  if (!cleanPhone)
    return res.status(400).json({ success: false, message: 'Valid phone number is required' });

  try {
    const stmt = db.prepare(`
      UPDATE customers SET
        full_name=?, phone=?, email=?, gender=?, address=?,
        notes=?, category=?, consented=?,
        updated_at=datetime('now','localtime')
      WHERE id=?
    `);
    const info = stmt.run(
      full_name.trim(), cleanPhone,
      email || '', gender || '', address || '',
      notes || '', category || 'general',
      consented ? 1 : 0,
      req.params.id
    );
    if (info.changes === 0)
      return res.status(404).json({ success: false, message: 'Customer not found' });

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'Phone number already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = (req, res) => {
  const db   = getDb();
  const info = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ success: false, message: 'Customer not found' });
  res.json({ success: true, message: 'Customer deleted' });
};

exports.getCategories = (req, res) => {
  const db   = getDb();
  const rows = db.prepare("SELECT DISTINCT category FROM customers ORDER BY category").all();
  res.json({ success: true, data: rows.map(r => r.category) });
};
