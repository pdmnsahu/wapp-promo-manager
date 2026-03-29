// backend/services/whatsappService.js
// Handles WhatsApp message sending — API mode or click-to-chat fallback

const axios = require('axios');
const { getDb } = require('../../database/db');

/**
 * Build a WhatsApp click-to-chat URL
 * @param {string} phone  - E.164 phone number, e.g. +919876543210
 * @param {string} text   - Pre-filled message text
 * @returns {string} URL
 */
function buildClickToChat(phone, text) {
  // Strip non-digits except leading +
  const cleaned = phone.replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

/**
 * Replace template placeholders with real values
 * @param {string} template
 * @param {object} vars
 * @returns {string}
 */
function fillTemplate(template, vars) {
  return template
    .replace(/{{name}}/g,          vars.name          || '')
    .replace(/{{occasion}}/g,      vars.occasion      || '')
    .replace(/{{business_name}}/g, vars.business_name || '')
    .replace(/{{discount}}/g,      vars.discount      || '')
    .replace(/{{offer_expiry}}/g,  vars.offer_expiry  || '')
    .replace(/{{custom_text}}/g,   vars.custom_text   || '');
}

/**
 * Load current settings from DB into a plain object
 */
function loadSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const s = {};
  rows.forEach(r => (s[r.key] = r.value));
  return s;
}

/**
 * Send via a third-party WhatsApp API provider (UltraMsg, Twilio, etc.)
 * Provider config comes from settings table.
 *
 * For UltraMsg  → POST https://api.ultramsg.com/{instance_id}/messages/chat
 * For Twilio    → POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
 *
 * The service abstracts these behind a generic interface.
 */
async function sendViaApi(phone, message, settings) {
  const provider = (settings.api_provider || '').toLowerCase();

  if (provider === 'ultramsg') {
    const url = `https://api.ultramsg.com/${settings.api_instance_id}/messages/chat`;
    const resp = await axios.post(url, {
      token: settings.api_token,
      to:    phone,
      body:  message,
    });
    return { success: true, raw: resp.data };
  }

  if (provider === 'twilio') {
    // Twilio uses Basic Auth (SID:Token) and form-encoded POST
    const url = `https://api.twilio.com/2010-04-01/Accounts/${settings.api_instance_id}/Messages.json`;
    const resp = await axios.post(url,
      new URLSearchParams({
        From: `whatsapp:${settings.business_phone}`,
        To:   `whatsapp:${phone}`,
        Body: message,
      }),
      {
        auth: { username: settings.api_instance_id, password: settings.api_token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    return { success: true, raw: resp.data };
  }

  // Generic provider — use endpoint from settings
  if (settings.api_endpoint) {
    const resp = await axios.post(settings.api_endpoint, {
      phone, message,
      token: settings.api_token,
    });
    return { success: true, raw: resp.data };
  }

  throw new Error(`Unsupported or unconfigured API provider: "${provider}"`);
}

/**
 * Core dispatch function — sends ONE message to ONE customer
 * Returns a log-ready result object
 */
async function dispatchMessage({ customer, occasion, templateBody, customVars = {} }) {
  const settings = loadSettings();

  // Fill in placeholders
  const message = fillTemplate(templateBody, {
    name:          customer.full_name,
    occasion:      occasion.name,
    business_name: settings.business_name || 'Our Business',
    discount:      customVars.discount    || settings.default_discount || '',
    offer_expiry:  customVars.offer_expiry|| settings.default_expiry   || '',
    custom_text:   customVars.custom_text || '',
  });

  const waLink = buildClickToChat(customer.phone, message);
  const mode   = settings.send_mode || 'manual';

  let status       = 'pending';
  let providerResp = null;

  if (mode === 'api') {
    try {
      const result = await sendViaApi(customer.phone, message, settings);
      status       = 'sent';
      providerResp = JSON.stringify(result.raw);
    } catch (err) {
      status       = 'failed';
      providerResp = err.message;
    }
  } else {
    // manual / click-to-chat — owner opens link themselves
    status = 'manual';
  }

  return { message, waLink, status, providerResp, mode };
}

module.exports = { dispatchMessage, buildClickToChat, fillTemplate, loadSettings };
