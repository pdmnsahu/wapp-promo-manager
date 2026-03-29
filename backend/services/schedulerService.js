// backend/services/schedulerService.js
// Daily cron job — checks occasions, finds eligible customers, dispatches messages

const cron  = require('node-cron');
const { getDb }           = require('../../database/db');
const { dispatchMessage, loadSettings } = require('./whatsappService');

let activeTask = null; // hold reference so we can restart on settings change

/**
 * Get today's date in MM-DD format (for yearly recurring occasions)
 * and YYYY-MM-DD for one-time occasions
 */
function todayStrings() {
  const now   = new Date();
  const yyyy  = now.getFullYear();
  const mm    = String(now.getMonth() + 1).padStart(2, '0');
  const dd    = String(now.getDate()).padStart(2, '0');
  return {
    mmdd:     `${mm}-${dd}`,
    yyyymmdd: `${yyyy}-${mm}-${dd}`,
  };
}

/**
 * Core daily job — called by cron or manually triggered
 */
async function runDailyJob() {
  const db       = getDb();
  const { mmdd, yyyymmdd } = todayStrings();

  console.log(`⏰  Scheduler running for date ${yyyymmdd} (MM-DD: ${mmdd})`);

  // 1. Find occasions that match today
  const occasions = db.prepare(`
    SELECT * FROM occasions
    WHERE messaging_on = 1
      AND (
        (recurrence = 'yearly' AND occasion_date = ?)
        OR
        (recurrence = 'once'   AND occasion_date = ?)
      )
  `).all(mmdd, yyyymmdd);

  if (occasions.length === 0) {
    console.log('   No occasions today.');
    return { processed: 0, skipped: 0 };
  }

  console.log(`   Found ${occasions.length} occasion(s) today.`);

  // 2. Get all consented customers
  const customers = db.prepare(
    "SELECT * FROM customers WHERE consented = 1"
  ).all();

  if (customers.length === 0) {
    console.log('   No consented customers found.');
    return { processed: 0, skipped: 0 };
  }

  let processed = 0, skipped = 0;
  const insertLog = db.prepare(`
    INSERT INTO message_logs
      (customer_id, customer_name, customer_phone,
       occasion_id, occasion_name, template_id,
       message_body, wa_link, send_mode, status, provider_resp)
    VALUES
      (@customer_id, @customer_name, @customer_phone,
       @occasion_id, @occasion_name, @template_id,
       @message_body, @wa_link, @send_mode, @status, @provider_resp)
  `);

  for (const occasion of occasions) {
    // 3. Find assigned template for this occasion
    const map = db.prepare(`
      SELECT t.* FROM templates t
      JOIN template_occasion_map m ON m.template_id = t.id
      WHERE m.occasion_id = ?
      ORDER BY t.is_default DESC
      LIMIT 1
    `).get(occasion.id);

    // Fall back to global default template if none assigned
    const template = map || db.prepare(
      "SELECT * FROM templates WHERE is_default = 1 LIMIT 1"
    ).get() || db.prepare(
      "SELECT * FROM templates LIMIT 1"
    ).get();

    if (!template) {
      console.log(`   ⚠️  No template found for occasion "${occasion.name}". Skipping.`);
      continue;
    }

    for (const customer of customers) {
      // 4. Prevent duplicate sends for same customer + occasion on same calendar day
      const already = db.prepare(`
        SELECT id FROM message_logs
        WHERE customer_id  = ?
          AND occasion_id  = ?
          AND status NOT IN ('failed')
          AND DATE(sent_at) = DATE('now','localtime')
      `).get(customer.id, occasion.id);

      if (already) {
        skipped++;
        continue;
      }

      // 5. Dispatch
      try {
        const result = await dispatchMessage({
          customer,
          occasion,
          templateBody: template.body,
        });

        insertLog.run({
          customer_id:    customer.id,
          customer_name:  customer.full_name,
          customer_phone: customer.phone,
          occasion_id:    occasion.id,
          occasion_name:  occasion.name,
          template_id:    template.id,
          message_body:   result.message,
          wa_link:        result.waLink,
          send_mode:      result.mode,
          status:         result.status,
          provider_resp:  result.providerResp || null,
        });

        processed++;
      } catch (err) {
        console.error(`   ❌  Error for customer ${customer.id}:`, err.message);
        insertLog.run({
          customer_id:    customer.id,
          customer_name:  customer.full_name,
          customer_phone: customer.phone,
          occasion_id:    occasion.id,
          occasion_name:  occasion.name,
          template_id:    template.id,
          message_body:   '',
          wa_link:        '',
          send_mode:      'error',
          status:         'failed',
          provider_resp:  err.message,
        });
      }
    }
  }

  console.log(`   ✅  Done. Processed: ${processed}, Skipped (dup): ${skipped}`);
  return { processed, skipped };
}

/**
 * Start (or restart) the cron scheduler.
 * time format: "HH:MM"  →  cron expression "MM HH * * *"
 */
function startScheduler(timeStr) {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }

  const [hh, mm] = (timeStr || '09:00').split(':');
  const expr = `${parseInt(mm)} ${parseInt(hh)} * * *`;  // daily

  activeTask = cron.schedule(expr, async () => {
    await runDailyJob();
  }, { timezone: 'Asia/Kolkata' });

  console.log(`⏰  Scheduler set for ${timeStr} IST (cron: "${expr}")`);
}

module.exports = { startScheduler, runDailyJob };
