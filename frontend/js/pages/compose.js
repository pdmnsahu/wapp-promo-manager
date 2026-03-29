// frontend/js/pages/compose.js

async function renderCompose() {
  document.getElementById('pageTitle').textContent = 'Send Messages';
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">Send Promotional Messages</div>
      <div class="page-sub">Send to one customer or bulk-send to all consented customers</div>
    </div>

    <div class="two-col">
      <!-- Single send -->
      <div class="card">
        <div class="card-header"><span class="card-title">📤 Send to One Customer</span></div>
        <div class="form-grid" style="grid-template-columns:1fr">
          <div class="form-group">
            <label>Customer *</label>
            <select id="sc_customer"><option value="">Loading…</option></select>
          </div>
          <div class="form-group">
            <label>Occasion *</label>
            <select id="sc_occasion"><option value="">Loading…</option></select>
          </div>
          <div class="form-group">
            <label>Template (optional override)</label>
            <select id="sc_template"><option value="">— Auto select —</option></select>
          </div>
          <div class="form-group">
            <label>Custom Discount</label>
            <input id="sc_discount" type="text" placeholder="e.g. 30% OFF" />
          </div>
          <div class="form-group">
            <label>Offer Expiry</label>
            <input id="sc_expiry" type="text" placeholder="e.g. Dec 31" />
          </div>
          <div class="form-group">
            <label>Custom Text (optional)</label>
            <textarea id="sc_custom" rows="2" placeholder="Any extra text…"></textarea>
          </div>
        </div>
        <div class="flex-row mt-16">
          <button class="btn btn-primary" id="sendSingleBtn">📤 Send / Prepare</button>
          <button class="btn btn-ghost" id="previewSingleBtn">👁 Preview</button>
        </div>
        <div id="singleResult" class="mt-16"></div>
      </div>

      <!-- Bulk send -->
      <div class="card">
        <div class="card-header"><span class="card-title">📢 Bulk Send (All Consented)</span></div>
        <div class="form-grid" style="grid-template-columns:1fr">
          <div class="form-group">
            <label>Occasion *</label>
            <select id="bc_occasion"><option value="">Loading…</option></select>
          </div>
          <div class="form-group">
            <label>Template (optional override)</label>
            <select id="bc_template"><option value="">— Auto select —</option></select>
          </div>
          <div class="form-group">
            <label>Custom Discount</label>
            <input id="bc_discount" type="text" placeholder="e.g. 25% OFF" />
          </div>
          <div class="form-group">
            <label>Offer Expiry</label>
            <input id="bc_expiry" type="text" placeholder="e.g. 3 days" />
          </div>
          <div class="form-group">
            <label>Custom Text</label>
            <textarea id="bc_custom" rows="2" placeholder="Any extra text…"></textarea>
          </div>
        </div>
        <div class="flex-row mt-16">
          <button class="btn btn-warning" id="sendBulkBtn">📢 Send to All Consented</button>
        </div>
        <div id="bulkResult" class="mt-16"></div>
      </div>
    </div>`;

  // Load dropdowns
  const [custRes, occRes, tplRes] = await Promise.all([
    API.get('/api/customers?consented=1'),
    API.get('/api/occasions'),
    API.get('/api/templates'),
  ]);

  const customerSel = document.getElementById('sc_customer');
  const occSelS     = document.getElementById('sc_occasion');
  const occSelB     = document.getElementById('bc_occasion');
  const tplSelS     = document.getElementById('sc_template');
  const tplSelB     = document.getElementById('bc_template');

  if (custRes.success) {
    customerSel.innerHTML = '<option value="">Select customer…</option>' +
      custRes.data.map(c => `<option value="${c.id}">${esc(c.full_name)} · ${esc(c.phone)}</option>`).join('');
  }
  const occOptions = '<option value="">Select occasion…</option>' +
    (occRes.success ? occRes.data.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('') : '');
  occSelS.innerHTML = occOptions;
  occSelB.innerHTML = occOptions;

  const tplOptions = '<option value="">— Auto select —</option>' +
    (tplRes.success ? tplRes.data.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('') : '');
  tplSelS.innerHTML = tplOptions;
  tplSelB.innerHTML = tplOptions;

  // Single send
  document.getElementById('sendSingleBtn').onclick = async () => {
    const body = {
      customer_id:  parseInt(customerSel.value),
      occasion_id:  parseInt(occSelS.value),
      template_id:  tplSelS.value ? parseInt(tplSelS.value) : null,
      discount:     document.getElementById('sc_discount').value,
      offer_expiry: document.getElementById('sc_expiry').value,
      custom_text:  document.getElementById('sc_custom').value,
    };
    if (!body.customer_id || !body.occasion_id) { showToast('Select customer and occasion', 'error'); return; }
    const btn = document.getElementById('sendSingleBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    const r = await API.post('/api/messages/send', body);
    btn.disabled = false; btn.textContent = '📤 Send / Prepare';

    const out = document.getElementById('singleResult');
    if (r.success) {
      showToast('Done! Check result below.', 'success');
      out.innerHTML = renderSendResult([r.data]);
    } else {
      showToast(r.message || 'Error', 'error');
      out.innerHTML = `<p class="text-red">${esc(r.message)}</p>`;
    }
  };

  // Preview
  document.getElementById('previewSingleBtn').onclick = async () => {
    const custId = customerSel.value;
    const occId  = occSelS.value;
    if (!custId || !occId) { showToast('Select customer and occasion first', 'error'); return; }
    const cust  = custRes.data?.find(c => c.id == custId);
    const occ   = occRes.data?.find(o => o.id == occId);
    const settRes = await API.get('/api/settings');
    const s     = settRes.data || {};

    let tplBody = '';
    if (tplSelS.value) {
      const tr = await API.get(`/api/templates/${tplSelS.value}`);
      tplBody = tr.data?.body || '';
    } else {
      const tr = await API.get(`/api/occasions/${occId}/template`);
      tplBody = tr.data?.body || '(No template assigned — please assign one)';
    }

    const prev = await API.post('/api/templates/preview', {
      body: tplBody,
      vars: {
        name:          cust?.full_name,
        occasion:      occ?.name,
        business_name: s.business_name,
        discount:      document.getElementById('sc_discount').value || s.default_discount,
        offer_expiry:  document.getElementById('sc_expiry').value   || s.default_expiry,
        custom_text:   document.getElementById('sc_custom').value,
      }
    });

    openModal(`
      <div class="modal-title">👁 Message Preview</div>
      <p class="text-muted" style="margin-bottom:10px">To: <strong>${esc(cust?.full_name)}</strong> (${esc(cust?.phone)})</p>
      <div class="msg-preview">${esc(prev.data?.preview || '')}</div>
      <div class="flex-row mt-16"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
    `);
  };

  // Bulk send
  document.getElementById('sendBulkBtn').onclick = async () => {
    if (!occSelB.value) { showToast('Select an occasion', 'error'); return; }
    if (!confirmAction('Send to ALL consented customers for this occasion?')) return;
    const body = {
      occasion_id:  parseInt(occSelB.value),
      template_id:  tplSelB.value ? parseInt(tplSelB.value) : null,
      discount:     document.getElementById('bc_discount').value,
      offer_expiry: document.getElementById('bc_expiry').value,
      custom_text:  document.getElementById('bc_custom').value,
    };
    const btn = document.getElementById('sendBulkBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    const r = await API.post('/api/messages/bulk', body);
    btn.disabled = false; btn.textContent = '📢 Send to All Consented';

    const out = document.getElementById('bulkResult');
    if (r.success) {
      showToast(`Done! ${r.total} messages processed.`, 'success');
      out.innerHTML = renderSendResult(r.data);
    } else {
      showToast(r.message || 'Error', 'error');
      out.innerHTML = `<p class="text-red">${esc(r.message)}</p>`;
    }
  };
}

function renderSendResult(results) {
  if (!results || results.length === 0) return '<p class="text-muted">No results.</p>';
  return `
    <div class="occasion-list">
      ${results.map(r => `
        <div class="occasion-item" style="flex-direction:column;align-items:flex-start;gap:8px">
          <div class="flex-row" style="width:100%;justify-content:space-between">
            <span class="occasion-name">${esc(r.name || 'Customer')}</span>
            ${statusBadge(r.status)}
          </div>
          ${r.message ? `<div class="msg-preview" style="max-height:60px;width:100%">${esc(r.message)}</div>` : ''}
          ${r.waLink && (r.status === 'manual' || r.status === 'pending')
            ? `<a class="wa-link" href="${r.waLink}" target="_blank">📲 Open in WhatsApp</a>`
            : ''}
          ${r.error ? `<p class="text-red" style="font-size:0.8rem">${esc(r.error)}</p>` : ''}
        </div>`).join('')}
    </div>`;
}
