// frontend/js/pages/logs.js

async function renderLogs() {
  document.getElementById('pageTitle').textContent = 'Message Logs';
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">Message Logs</div>
      <div class="page-sub">History of all promotional messages</div>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="logSearch" placeholder="Search customer, phone, occasion…" />
        </div>
        <select id="logStatus" style="width:130px">
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="manual">Manual</option>
          <option value="pending">Pending</option>
        </select>
        <input type="date" id="logFrom" style="width:140px" title="From date" />
        <input type="date" id="logTo"   style="width:140px" title="To date" />
        <button class="btn btn-ghost btn-sm" id="logClear">Clear</button>
      </div>
      <div class="table-wrap" id="logTable">Loading…</div>
    </div>`;

  const load = () => loadLogs();
  document.getElementById('logSearch').addEventListener('input', debounce(load, 350));
  document.getElementById('logStatus').addEventListener('change', load);
  document.getElementById('logFrom').addEventListener('change', load);
  document.getElementById('logTo').addEventListener('change', load);
  document.getElementById('logClear').addEventListener('click', () => {
    document.getElementById('logSearch').value = '';
    document.getElementById('logStatus').value = '';
    document.getElementById('logFrom').value   = '';
    document.getElementById('logTo').value     = '';
    load();
  });

  await loadLogs();
}

async function loadLogs() {
  const search = document.getElementById('logSearch')?.value || '';
  const status = document.getElementById('logStatus')?.value || '';
  const from   = document.getElementById('logFrom')?.value   || '';
  const to     = document.getElementById('logTo')?.value     || '';

  const params = new URLSearchParams({ limit: 100 });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (from)   params.set('from',   from);
  if (to)     params.set('to',     to);

  const res = await API.get(`/api/messages/logs?${params}`);
  const tbl = document.getElementById('logTable');
  if (!tbl) return;

  if (!res.success || res.data.length === 0) {
    tbl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No logs found.</p></div>`;
    return;
  }

  tbl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Customer</th><th>Occasion</th><th>Status</th>
          <th>Mode</th><th>Sent At</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${res.data.map(l => `
          <tr>
            <td>
              <strong>${esc(l.customer_name || '—')}</strong>
              <br><span class="text-muted" style="font-family:var(--mono);font-size:0.78rem">${esc(l.customer_phone || '')}</span>
            </td>
            <td>${esc(l.occasion_name || '—')}</td>
            <td>${statusBadge(l.status)}</td>
            <td><span class="badge badge-gray">${esc(l.send_mode || '—')}</span></td>
            <td class="text-muted">${fmtDate(l.sent_at)}</td>
            <td>
              <div class="flex-row">
                <button class="btn btn-ghost btn-sm" onclick="viewLog(${l.id})">👁 View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLog(${l.id})">🗑</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
    <p class="text-muted" style="margin-top:12px;font-size:0.8rem">Showing ${res.data.length} of ${res.total} logs</p>`;
}

async function viewLog(id) {
  const res = await API.get(`/api/messages/logs?limit=1000`);
  const log = res.data?.find(l => l.id === id);
  if (!log) return;

  openModal(`
    <div class="modal-title">📋 Log #${log.id}</div>
    <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
      ${[
        ['Customer',   esc(log.customer_name) + ' · ' + esc(log.customer_phone)],
        ['Occasion',   esc(log.occasion_name)],
        ['Status',     statusBadge(log.status)],
        ['Mode',       esc(log.send_mode)],
        ['Sent At',    fmtDate(log.sent_at)],
        ['Provider Resp', esc(log.provider_resp || '—')],
      ].map(([k,v]) => `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px;color:var(--text2);width:140px;font-weight:600">${k}</td>
          <td style="padding:8px">${v}</td>
        </tr>`).join('')}
    </table>
    <div class="mt-16">
      <label style="font-size:0.78rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Message</label>
      <div class="msg-preview mt-16">${esc(log.message_body || '—')}</div>
    </div>
    ${log.wa_link ? `
      <div class="mt-16">
        <a class="wa-link" href="${esc(log.wa_link)}" target="_blank">📲 Open WhatsApp Link</a>
      </div>` : ''}
    <div class="flex-row mt-16">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `);
}

async function deleteLog(id) {
  if (!confirmAction('Delete this log entry?')) return;
  const r = await API.del(`/api/messages/logs/${id}`);
  if (r.success) { showToast('Log deleted', 'success'); loadLogs(); }
  else showToast(r.message || 'Error', 'error');
}
