// backend/controllers/occasionController.js

const { getDb } = require('../../database/db');

// Utility: get upcoming occasions within `days` days
function getUpcoming(db, days) {
  const today = new Date();
  const upcoming = [];

  const occasions = db.prepare('SELECT * FROM occasions ORDER BY occasion_date').all();

  occasions.forEach(o => {
    let matchDate;
    if (o.recurrence === 'yearly') {
      // MM-DD: build this year's and next year's date
      const [mm, dd] = o.occasion_date.split('-').map(Number);
      const thisYear = new Date(today.getFullYear(), mm - 1, dd);
      matchDate = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, mm - 1, dd);
    } else {
      // YYYY-MM-DD
      matchDate = new Date(o.occasion_date);
    }

    const diff = Math.ceil((matchDate - today) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= days) {
      upcoming.push({ ...o, days_away: diff, next_date: matchDate.toISOString().slice(0, 10) });
    }
  });

  return upcoming.sort((a, b) => a.days_away - b.days_away);
}

exports.getAll = (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT * FROM occasions ORDER BY occasion_date').all();
  res.json({ success: true, data: rows });
};

exports.getOne = (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM occasions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Occasion not found' });
  res.json({ success: true, data: row });
};

exports.getUpcoming = (req, res) => {
  const db   = getDb();
  const days = parseInt(req.query.days) || 30;
  res.json({ success: true, data: getUpcoming(db, days) });
};

exports.getToday = (req, res) => {
  const db   = getDb();
  const now  = new Date();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const mmdd = `${mm}-${dd}`;
  const yyyymmdd = `${now.getFullYear()}-${mm}-${dd}`;

  const rows = db.prepare(`
    SELECT * FROM occasions
    WHERE (recurrence = 'yearly' AND occasion_date = ?)
       OR (recurrence IN ('once','none') AND occasion_date = ?)
  `).all(mmdd, yyyymmdd);

  res.json({ success: true, data: rows });
};

exports.create = (req, res) => {
  const db = getDb();
  const { name, occasion_date, recurrence, description, messaging_on } = req.body;
  if (!name || !occasion_date)
    return res.status(400).json({ success: false, message: 'Name and date are required' });

  try {
    const info = db.prepare(`
      INSERT INTO occasions(name, occasion_date, recurrence, description, messaging_on)
      VALUES(?,?,?,?,?)
    `).run(name.trim(), occasion_date, recurrence || 'yearly', description || '', messaging_on ? 1 : 0);

    const created = db.prepare('SELECT * FROM occasions WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = (req, res) => {
  const db = getDb();
  const { name, occasion_date, recurrence, description, messaging_on } = req.body;
  if (!name || !occasion_date)
    return res.status(400).json({ success: false, message: 'Name and date are required' });

  const info = db.prepare(`
    UPDATE occasions SET name=?,occasion_date=?,recurrence=?,description=?,messaging_on=?
    WHERE id=?
  `).run(name.trim(), occasion_date, recurrence || 'yearly', description || '', messaging_on ? 1 : 0, req.params.id);

  if (info.changes === 0)
    return res.status(404).json({ success: false, message: 'Occasion not found' });
  const updated = db.prepare('SELECT * FROM occasions WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
};

exports.remove = (req, res) => {
  const db   = getDb();
  const info = db.prepare('DELETE FROM occasions WHERE id = ?').run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ success: false, message: 'Occasion not found' });
  res.json({ success: true, message: 'Occasion deleted' });
};

// Assign template to occasion
exports.assignTemplate = (req, res) => {
  const db = getDb();
  const { template_id } = req.body;
  const { id } = req.params;
  try {
    db.prepare(`
      INSERT OR REPLACE INTO template_occasion_map(template_id, occasion_id) VALUES(?,?)
    `).run(template_id, id);
    res.json({ success: true, message: 'Template assigned' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAssignedTemplate = (req, res) => {
  const db  = getDb();
  const row = db.prepare(`
    SELECT t.* FROM templates t
    JOIN template_occasion_map m ON m.template_id = t.id
    WHERE m.occasion_id = ?
    ORDER BY t.is_default DESC LIMIT 1
  `).get(req.params.id);
  res.json({ success: true, data: row || null });
};
