// frontend/js/utils.js — Shared UI helpers

// ── Toast notifications ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('modalContent').innerHTML = '';
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ── Status badge ───────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    sent:    'badge-green',
    failed:  'badge-red',
    pending: 'badge-blue',
    manual:  'badge-yellow',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

// ── Consent badge ──────────────────────────────────────────────────────────
function consentBadge(v) {
  return v ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-red">No</span>';
}

// ── Date helpers ───────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtDateOnly(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

// ── Live clock ────────────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clockDisplay');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Confirm dialog ────────────────────────────────────────────────────────
function confirmAction(message) {
  return window.confirm(message);
}

// ── Escape HTML ───────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Days-away badge ───────────────────────────────────────────────────────
function daysAwayBadge(days) {
  if (days === 0) return '<span class="days-badge today">Today!</span>';
  if (days <= 3)  return `<span class="days-badge soon">${days}d away</span>`;
  return `<span class="days-badge future">${days}d away</span>`;
}
