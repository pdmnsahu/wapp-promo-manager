// backend/controllers/messageController.js

const { getDb }           = require('../../database/db');
const { dispatchMessage, buildClickToChat, fillTemplate, loadSettings } = require('../services/whatsappService');
const { runDailyJob }     = require('../services/schedulerService');

// ── Message logs ───────────────────────────────────────────────────────────

exports.getLogs = (req, res) => {
  const db = getDb();
  const { search, occasion, status, from, to, limit = 100, offset = 0 } = req.query;

  let sql = 'SELECT * FROM message_logs WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR occasion_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (occasion) { sql += ' AND occasion_name LIKE ?'; params.push(`%${occasion}%`); }
  if (status)   { sql += ' AND status = ?';           params.push(status); }
  if (from)     { sql += ' AND DATE(sent_at) >= ?';   params.push(from); }
  if (to)       { sql += ' AND DATE(sent_at) <= ?';   params.push(to); }

  sql += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  try {
    const rows  = db.prepare(sql).all(...params);
    const total = db.prepare(
      sql.replace('SELECT *', 'SELECT COUNT(*) as c').replace(/LIMIT.+/, '')
    ).get(...params.slice(0, -2)).c;

    res.json({ success: true, data: rows, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteLog = (req, res) => {
  const db   = getDb();
  const info = db.prepare('DELETE FROM message_logs WHERE id = ?').run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ success: false, message: 'Log not found' });
  res.json({ success: true, message: 'Log deleted' });
};

// ── Manual send (single customer + occasion) ───────────────────────────────

exports.sendManual = async (req, res) => {
  const db = getDb();
  const { customer_id, occasion_id, template_id, custom_text, discount, offer_expiry } = req.body;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  if (!customer.consented)
    return res.status(400).json({ success: false, message: 'Customer has not consented to messages' });

  const occasion = db.prepare('SELECT * FROM occasions WHERE id = ?').get(occasion_id);
  if (!occasion) return res.status(404).json({ success: false, message: 'Occasion not found' });

  let template;
  if (template_id) {
    template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  } else {
    template = db.prepare(`
      SELECT t.* FROM templates t
      JOIN template_occasion_map m ON m.template_id = t.id
      WHERE m.occasion_id = ? ORDER BY t.is_default DESC LIMIT 1
    `).get(occasion_id) || db.prepare("SELECT * FROM templates WHERE is_default=1 LIMIT 1").get();
  }

  if (!template) return res.status(400).json({ success: false, message: 'No template found' });

  try {
    const result = await dispatchMessage({
      customer, occasion, templateBody: template.body,
      customVars: { custom_text, discount, offer_expiry },
    });

    db.prepare(`
      INSERT INTO message_logs
        (customer_id,customer_name,customer_phone,occasion_id,occasion_name,template_id,
         message_body,wa_link,send_mode,status,provider_resp)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      customer.id, customer.full_name, customer.phone,
      occasion.id, occasion.name, template.id,
      result.message, result.waLink, result.mode, result.status, result.providerResp || null
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Bulk send: all consented customers for an occasion ─────────────────────

exports.sendBulk = async (req, res) => {
  const db = getDb();
  const { occasion_id, template_id, customer_ids, custom_text, discount, offer_expiry } = req.body;

  const occasion = db.prepare('SELECT * FROM occasions WHERE id = ?').get(occasion_id);
  if (!occasion) return res.status(404).json({ success: false, message: 'Occasion not found' });

  let template;
  if (template_id) {
    template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  } else {
    template = db.prepare(`
      SELECT t.* FROM templates t JOIN template_occasion_map m ON m.template_id=t.id
      WHERE m.occasion_id=? ORDER BY t.is_default DESC LIMIT 1
    `).get(occasion_id) || db.prepare("SELECT * FROM templates WHERE is_default=1 LIMIT 1").get();
  }

  if (!template) return res.status(400).json({ success: false, message: 'No template found' });

  // Use specific IDs or all consented
  let customers;
  if (customer_ids && customer_ids.length > 0) {
    const placeholders = customer_ids.map(() => '?').join(',');
    customers = db.prepare(
      `SELECT * FROM customers WHERE id IN (${placeholders}) AND consented=1`
    ).all(...customer_ids);
  } else {
    customers = db.prepare("SELECT * FROM customers WHERE consented=1").all();
  }

  const insertLog = db.prepare(`
    INSERT INTO message_logs
      (customer_id,customer_name,customer_phone,occasion_id,occasion_name,template_id,
       message_body,wa_link,send_mode,status,provider_resp)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
  `);

  const results = [];
  for (const customer of customers) {
    try {
      const result = await dispatchMessage({
        customer, occasion, templateBody: template.body,
        customVars: { custom_text, discount, offer_expiry },
      });
      insertLog.run(
        customer.id, customer.full_name, customer.phone,
        occasion.id, occasion.name, template.id,
        result.message, result.waLink, result.mode, result.status, result.providerResp || null
      );
      results.push({ customer_id: customer.id, name: customer.full_name, ...result });
    } catch (err) {
      results.push({ customer_id: customer.id, name: customer.full_name, status: 'failed', error: err.message });
    }
  }

  res.json({ success: true, data: results, total: results.length });
};

// ── Trigger scheduler manually ─────────────────────────────────────────────

exports.triggerScheduler = async (req, res) => {
  try {
    const result = await runDailyJob();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Dashboard stats ────────────────────────────────────────────────────────

exports.getDashboard = (req, res) => {
  const db = getDb();

  const totalCustomers    = db.prepare("SELECT COUNT(*) c FROM customers").get().c;
  const consentedCustomers= db.prepare("SELECT COUNT(*) c FROM customers WHERE consented=1").get().c;
  const totalSent         = db.prepare("SELECT COUNT(*) c FROM message_logs WHERE status='sent'").get().c;
  const totalFailed       = db.prepare("SELECT COUNT(*) c FROM message_logs WHERE status='failed'").get().c;
  const totalPending      = db.prepare("SELECT COUNT(*) c FROM message_logs WHERE status IN('pending','manual')").get().c;

  // Today's occasions
  const now  = new Date();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const mmdd = `${mm}-${dd}`;
  const yyyymmdd = `${now.getFullYear()}-${mm}-${dd}`;
  const todayOccasions = db.prepare(`
    SELECT * FROM occasions
    WHERE (recurrence='yearly' AND occasion_date=?)
       OR (recurrence IN('once','none') AND occasion_date=?)
  `).all(mmdd, yyyymmdd);

  // Upcoming 7 days
  const upcomingOccasions = [];
  const allOccasions = db.prepare('SELECT * FROM occasions').all();
  allOccasions.forEach(o => {
    let matchDate;
    if (o.recurrence === 'yearly') {
      const [omm, odd] = o.occasion_date.split('-').map(Number);
      const ty = new Date(now.getFullYear(), omm - 1, odd);
      matchDate = ty >= now ? ty : new Date(now.getFullYear() + 1, omm - 1, odd);
    } else {
      matchDate = new Date(o.occasion_date);
    }
    const diff = Math.ceil((matchDate - now) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) upcomingOccasions.push({ ...o, days_away: diff, next_date: matchDate.toISOString().slice(0,10) });
  });

  const recentLogs = db.prepare(
    "SELECT * FROM message_logs ORDER BY sent_at DESC LIMIT 10"
  ).all();

  res.json({
    success: true,
    data: {
      totalCustomers, consentedCustomers,
      totalSent, totalFailed, totalPending,
      todayOccasions,
      upcomingOccasions: upcomingOccasions.sort((a,b) => a.days_away - b.days_away),
      recentLogs,
    }
  });
};
