// database/db.js
// Initializes SQLite database, creates tables, and seeds default data

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'business.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better performance
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  // ── customers ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name   TEXT    NOT NULL,
      phone       TEXT    NOT NULL UNIQUE,
      email       TEXT,
      gender      TEXT    CHECK(gender IN ('male','female','other','')),
      address     TEXT,
      notes       TEXT,
      category    TEXT    DEFAULT 'general',
      consented   INTEGER DEFAULT 0,  -- 1 = yes, 0 = no
      created_at  TEXT    DEFAULT (datetime('now','localtime')),
      updated_at  TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── occasions ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS occasions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      occasion_date   TEXT    NOT NULL,  -- MM-DD for recurring, YYYY-MM-DD for one-time
      recurrence      TEXT    DEFAULT 'yearly' CHECK(recurrence IN ('yearly','once','none')),
      description     TEXT,
      messaging_on    INTEGER DEFAULT 1,
      created_at      TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── templates ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      body        TEXT    NOT NULL,
      is_default  INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now','localtime')),
      updated_at  TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── template ↔ occasion mapping ────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_occasion_map (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id   INTEGER NOT NULL REFERENCES templates(id)  ON DELETE CASCADE,
      occasion_id   INTEGER NOT NULL REFERENCES occasions(id)  ON DELETE CASCADE,
      UNIQUE(template_id, occasion_id)
    );
  `);

  // ── settings (key-value store) ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ── message_logs ───────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name   TEXT,
      customer_phone  TEXT,
      occasion_id     INTEGER REFERENCES occasions(id) ON DELETE SET NULL,
      occasion_name   TEXT,
      template_id     INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      message_body    TEXT,
      wa_link         TEXT,
      send_mode       TEXT    DEFAULT 'manual',
      status          TEXT    DEFAULT 'pending' CHECK(status IN ('sent','failed','pending','manual')),
      provider_resp   TEXT,
      sent_at         TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // Seed data (only if tables are empty)
  seedIfEmpty(db);

  console.log('✅  Database initialized at', DB_PATH);
  return db;
}

// ── Seed default data ──────────────────────────────────────────────────────
function seedIfEmpty(db) {
  const settingsCount = db.prepare("SELECT COUNT(*) as c FROM settings").get().c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)");
    const defaults = [
      ['business_name',     'My Business'],
      ['business_phone',    '+910000000000'],
      ['default_discount',  '20% OFF'],
      ['default_expiry',    '3 days'],
      ['send_mode',         'manual'],       // 'api' or 'manual'
      ['api_provider',      ''],             // e.g. 'twilio', 'ultramsg'
      ['api_instance_id',   ''],
      ['api_token',         ''],
      ['api_endpoint',      ''],
      ['scheduler_time',    '09:00'],
      ['auto_send',         '0'],            // 0 = prepare only, 1 = auto-send
    ];
    defaults.forEach(([k, v]) => insertSetting.run(k, v));
  }

  const occasionCount = db.prepare("SELECT COUNT(*) as c FROM occasions").get().c;
  if (occasionCount === 0) {
    const ins = db.prepare(`
      INSERT INTO occasions(name, occasion_date, recurrence, description, messaging_on)
      VALUES(?,?,?,?,?)
    `);
    const occasions = [
      ['New Year',          '01-01', 'yearly', 'New Year celebrations',                1],
      ['Republic Day',      '01-26', 'yearly', 'Indian Republic Day',                  1],
      ['Holi',              '03-14', 'yearly', 'Festival of Colors',                   1],
      ['Ram Navami',        '04-17', 'yearly', 'Birthday of Lord Ram',                 1],
      ['Independence Day',  '08-15', 'yearly', 'Indian Independence Day',              1],
      ['Diwali',            '10-20', 'yearly', 'Festival of Lights',                   1],
      ['Christmas',         '12-25', 'yearly', 'Christmas celebrations',               1],
      ['Eid ul-Fitr',       '04-10', 'yearly', 'End of Ramadan',                       1],
    ];
    occasions.forEach(o => ins.run(...o));
  }

  const templateCount = db.prepare("SELECT COUNT(*) as c FROM templates").get().c;
  if (templateCount === 0) {
    const ins = db.prepare(`
      INSERT INTO templates(name, body, is_default) VALUES(?,?,?)
    `);
    const templates = [
      [
        'General Festival Greeting',
        '🎉 Happy {{occasion}}, {{name}}!\n\nWishing you and your family joy and prosperity. As a valued customer of {{business_name}}, enjoy {{discount}} on your next visit!\n\nOffer valid till: {{offer_expiry}}\n\n{{custom_text}}\n\nVisit us or reply to this message to avail your offer!',
        1
      ],
      [
        'Sale Campaign',
        '🛍️ {{name}}, BIG SALE at {{business_name}}!\n\nCelebrating {{occasion}} with SPECIAL OFFERS — flat {{discount}} OFF!\n\nHurry, offer ends: {{offer_expiry}}\n\n{{custom_text}}',
        0
      ],
      [
        'Short Festive Wish',
        '✨ {{business_name}} wishes you a very Happy {{occasion}}, {{name}}! 🎊\n\nSpecial {{discount}} offer just for you — valid till {{offer_expiry}}.',
        0
      ],
    ];
    templates.forEach(t => ins.run(...t));
  }

  const customerCount = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
  if (customerCount === 0) {
    const ins = db.prepare(`
      INSERT INTO customers(full_name,phone,email,gender,address,notes,category,consented)
      VALUES(?,?,?,?,?,?,?,?)
    `);
    const customers = [
      ['Priya Sharma',    '+919876543210', 'priya@example.com',  'female', 'Mumbai, MH',   'Regular customer',    'vip',     1],
      ['Rahul Verma',     '+919812345678', 'rahul@example.com',  'male',   'Delhi, DL',    'Wholesale buyer',     'wholesale',1],
      ['Anita Patel',     '+918765432109', 'anita@example.com',  'female', 'Ahmedabad, GJ','Prefers evenings',    'general', 1],
      ['Suresh Kumar',    '+917654321098', '',                   'male',   'Chennai, TN',  'New customer',        'general', 0],
      ['Meena Iyer',      '+916543210987', 'meena@example.com',  'female', 'Bangalore, KA','Frequent buyer',      'vip',     1],
    ];
    customers.forEach(c => ins.run(...c));
  }
}

module.exports = { getDb, initializeDatabase };
