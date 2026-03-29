// frontend/js/pages/occasions.js

async function renderOccasions() {
  document.getElementById('pageTitle').textContent = 'Occasions';
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Special Occasions</div>
        <div class="page-sub">Festival and event dates for promotional messaging</div>
      </div>
      <button class="btn btn-primary" id="addOccBtn">➕ Add Occasion</button>
    </div>

    <div class="two-col">
      <div>
        <!-- Upcoming -->
        <div class="card" id="upcomingCard">
          <div class="card-header">
            <span class="card-title">📅 Upcoming Occasions</span>
            <select id="upcomingDays" style="width:110px">
              <option value="7">Next 7 days</option>
              <option value="15">Next 15 days</option>
              <option value="30" selected>Next 30 days</option>
            </select>
          </div>
          <div id="upcomingList">Loading…</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">📋 All Occasions</span></div>
        <div id="allOccasionsList">Loading…</div>
      </div>
    </div>`;

  document.getElementById('addOccBtn').onclick = () => openOccasionForm(null);
  document.getElementById('upcomingDays').addEventListener('change', loadUpcoming);

  await Promise.all([loadUpcoming(), loadAllOccasions()]);
}

async function loadUpcoming() {
  const days = document.getElementById('upcomingDays')?.value || 30;
  const el   = document.getElementById('upcomingList');
  if (!el) return;
  const res  = await API.get(`/api/occasions/upcoming?days=${days}`);
  if (!res.success || res.data.length === 0) {
    el.innerHTML = '<p class="text-muted">None in this window.</p>'; return;
  }
  el.innerHTML = `<div class="occasion-list">${res.data.map(o => `
    <div class="occasion-item">
      <div>
        <div class="occasion-name">${esc(o.name)}</div>
        <div class="occasion-date">${o.next_date} · ${o.recurrence}</div>
      </div>
      ${daysAwayBadge(o.days_away)}
    </div>`).join('')}</div>`;
}

async function loadAllOccasions() {
  const el  = document.getElementById('allOccasionsList');
  if (!el) return;
  const res = await API.get('/api/occasions');
  if (!res.success || res.data.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>No occasions yet.</p></div>'; return;
  }
  el.innerHTML = `<div class="occasion-list">${res.data.map(o => `
    <div class="occasion-item">
      <div style="flex:1">
        <div class="occasion-name">${esc(o.name)}</div>
        <div class="occasion-date">${o.occasion_date} · <span style="font-size:0.75rem">${o.recurrence}</span></div>
        ${o.description ? `<div class="text-muted" style="margin-top:3px">${esc(o.description)}</div>` : ''}
      </div>
      <div class="flex-row">
        ${o.messaging_on
          ? '<span class="badge badge-green">Msg ON</span>'
          : '<span class="badge badge-gray">Msg OFF</span>'}
        <button class="btn btn-ghost btn-sm" onclick="openOccasionForm(${o.id})">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="openAssignTemplate(${o.id}, '${esc(o.name)}')">🔗 Template</button>
        <button class="btn btn-danger btn-sm" onclick="deleteOccasion(${o.id}, '${esc(o.name)}')">🗑</button>
      </div>
    </div>`).join('')}</div>`;
}

async function openOccasionForm(id) {
  let occ = null;
  if (id) { const r = await API.get(`/api/occasions/${id}`); if (r.success) occ = r.data; }

  openModal(`
    <div class="modal-title">${occ ? '✏️ Edit Occasion' : '➕ Add Occasion'}</div>
    <div class="form-grid">
      <div class="form-group full">
        <label>Occasion Name *</label>
        <input id="of_name" type="text" value="${esc(occ?.name || '')}" placeholder="e.g. Diwali Sale" />
      </div>
      <div class="form-group">
        <label>Date *</label>
        <input id="of_date" type="text" value="${esc(occ?.occasion_date || '')}"
          placeholder="MM-DD for yearly, YYYY-MM-DD for one-time" />
        <span class="text-muted">Yearly: 08-15 | One-time: 2025-11-01</span>
      </div>
      <div class="form-group">
        <label>Recurrence</label>
        <select id="of_recurrence">
          <option value="yearly" ${occ?.recurrence==='yearly'?'selected':''}>Every Year</option>
          <option value="once"   ${occ?.recurrence==='once'?'selected':''}>One Time</option>
          <option value="none"   ${occ?.recurrence==='none'?'selected':''}>None</option>
        </select>
      </div>
      <div class="form-group full">
        <label>Description</label>
        <input id="of_desc" type="text" value="${esc(occ?.description || '')}" placeholder="Optional notes" />
      </div>
      <div class="form-group full">
        <div class="checkbox-row">
          <input type="checkbox" id="of_msg" ${occ?.messaging_on !== 0 ? 'checked' : ''} />
          <label for="of_msg" style="text-transform:none">Enable promotional messaging for this occasion</label>
        </div>
      </div>
    </div>
    <div class="flex-row mt-16">
      <button class="btn btn-primary" id="saveOccBtn">${occ ? 'Save' : 'Add Occasion'}</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);

  document.getElementById('saveOccBtn').onclick = async () => {
    const body = {
      name:         document.getElementById('of_name').value.trim(),
      occasion_date:document.getElementById('of_date').value.trim(),
      recurrence:   document.getElementById('of_recurrence').value,
      description:  document.getElementById('of_desc').value.trim(),
      messaging_on: document.getElementById('of_msg').checked ? 1 : 0,
    };
    if (!body.name || !body.occasion_date) { showToast('Name and date are required', 'error'); return; }
    const r = occ
      ? await API.put(`/api/occasions/${occ.id}`, body)
      : await API.post('/api/occasions', body);
    if (r.success) {
      showToast(occ ? 'Occasion updated!' : 'Occasion added!', 'success');
      closeModal(); loadAllOccasions(); loadUpcoming();
    } else { showToast(r.message || 'Error', 'error'); }
  };
}

async function openAssignTemplate(occId, occName) {
  const tRes = await API.get('/api/templates');
  const assigned = await API.get(`/api/occasions/${occId}/template`);
  const assignedId = assigned.data?.id || '';

  openModal(`
    <div class="modal-title">🔗 Assign Template to "${esc(occName)}"</div>
    <div class="form-group">
      <label>Select Template</label>
      <select id="tpl_sel">
        <option value="">— Use default template —</option>
        ${(tRes.data || []).map(t => `<option value="${t.id}" ${t.id==assignedId?'selected':''}>${esc(t.name)}</option>`).join('')}
      </select>
    </div>
    <div class="flex-row mt-16">
      <button class="btn btn-primary" id="assignTplBtn">Assign</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);

  document.getElementById('assignTplBtn').onclick = async () => {
    const tid = document.getElementById('tpl_sel').value;
    if (!tid) { showToast('Please select a template', 'error'); return; }
    const r = await API.post(`/api/occasions/${occId}/template`, { template_id: tid });
    if (r.success) { showToast('Template assigned!', 'success'); closeModal(); }
    else showToast(r.message, 'error');
  };
}

async function deleteOccasion(id, name) {
  if (!confirmAction(`Delete occasion "${name}"?`)) return;
  const r = await API.del(`/api/occasions/${id}`);
  if (r.success) { showToast('Deleted', 'success'); loadAllOccasions(); loadUpcoming(); }
  else showToast(r.message || 'Error', 'error');
}
