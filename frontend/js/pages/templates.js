// frontend/js/pages/templates.js

const PLACEHOLDERS = ['{{name}}','{{occasion}}','{{business_name}}','{{discount}}','{{offer_expiry}}','{{custom_text}}'];

async function renderTemplates() {
  document.getElementById('pageTitle').textContent = 'Message Templates';
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Message Templates</div>
        <div class="page-sub">Create and manage promotional message templates</div>
      </div>
      <button class="btn btn-primary" id="addTplBtn">➕ New Template</button>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Available Placeholders</span>
      </div>
      <div class="placeholder-tags">
        ${PLACEHOLDERS.map(p => `<span class="placeholder-tag">${p}</span>`).join('')}
      </div>
      <p class="text-muted mt-16" style="font-size:0.8rem">
        Click a placeholder to copy it. Use these in your template body to auto-fill customer and occasion details.
      </p>
    </div>
    <div class="mt-24" id="tplList">Loading…</div>`;

  document.getElementById('addTplBtn').onclick = () => openTemplateForm(null);
  document.querySelectorAll('.placeholder-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      navigator.clipboard?.writeText(tag.textContent);
      showToast(`Copied ${tag.textContent}`, 'info');
    });
  });

  await loadTemplates();
}

async function loadTemplates() {
  const el  = document.getElementById('tplList');
  if (!el) return;
  const res = await API.get('/api/templates');
  if (!res.success || res.data.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">✉️</div><p>No templates yet.</p></div>'; return;
  }
  el.innerHTML = `<div class="occasion-list">${res.data.map(t => `
    <div class="occasion-item" style="flex-direction:column;align-items:flex-start;gap:10px">
      <div class="flex-row" style="width:100%;justify-content:space-between">
        <div>
          <span class="occasion-name">${esc(t.name)}</span>
          ${t.is_default ? '<span class="badge badge-green" style="margin-left:8px">Default</span>' : ''}
        </div>
        <div class="flex-row">
          <button class="btn btn-ghost btn-sm" onclick="previewTemplate(${t.id})">👁 Preview</button>
          <button class="btn btn-ghost btn-sm" onclick="openTemplateForm(${t.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTemplate(${t.id}, '${esc(t.name)}')">🗑</button>
        </div>
      </div>
      <div class="msg-preview" style="width:100%;max-height:80px">${esc(t.body)}</div>
    </div>`).join('')}</div>`;
}

async function openTemplateForm(id) {
  let tpl = null;
  if (id) { const r = await API.get(`/api/templates/${id}`); if (r.success) tpl = r.data; }

  openModal(`
    <div class="modal-title">${tpl ? '✏️ Edit Template' : '➕ New Template'}</div>
    <div class="form-grid">
      <div class="form-group full">
        <label>Template Name *</label>
        <input id="tf_name" type="text" value="${esc(tpl?.name || '')}" placeholder="e.g. Diwali Greeting" />
      </div>
      <div class="form-group full">
        <label>Message Body *</label>
        <div class="placeholder-tags" style="margin-bottom:8px">
          ${PLACEHOLDERS.map(p => `<span class="placeholder-tag" onclick="insertPlaceholder('${p}')">${p}</span>`).join('')}
        </div>
        <textarea id="tf_body" rows="7" placeholder="Type your message here…">${esc(tpl?.body || '')}</textarea>
      </div>
      <div class="form-group full">
        <div class="checkbox-row">
          <input type="checkbox" id="tf_default" ${tpl?.is_default ? 'checked' : ''} />
          <label for="tf_default" style="text-transform:none">Set as default template (used when no template is assigned to an occasion)</label>
        </div>
      </div>
    </div>
    <div class="flex-row mt-16">
      <button class="btn btn-primary" id="saveTplBtn">${tpl ? 'Save' : 'Create Template'}</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);

  document.getElementById('saveTplBtn').onclick = async () => {
    const body = {
      name:       document.getElementById('tf_name').value.trim(),
      body:       document.getElementById('tf_body').value.trim(),
      is_default: document.getElementById('tf_default').checked ? 1 : 0,
    };
    if (!body.name || !body.body) { showToast('Name and body required', 'error'); return; }
    const r = tpl
      ? await API.put(`/api/templates/${tpl.id}`, body)
      : await API.post('/api/templates', body);
    if (r.success) {
      showToast(tpl ? 'Template updated!' : 'Template created!', 'success');
      closeModal(); loadTemplates();
    } else showToast(r.message || 'Error', 'error');
  };
}

function insertPlaceholder(ph) {
  const ta = document.getElementById('tf_body');
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + ph + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + ph.length;
  ta.focus();
}

async function previewTemplate(id) {
  const r = await API.get(`/api/templates/${id}`);
  if (!r.success) return;
  const prev = await API.post('/api/templates/preview', { body: r.data.body, vars: {} });
  openModal(`
    <div class="modal-title">👁 Template Preview</div>
    <p class="text-muted" style="margin-bottom:12px">Preview with sample values:</p>
    <div class="msg-preview">${esc(prev.data?.preview || '')}</div>
    <div class="flex-row mt-16">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `);
}

async function deleteTemplate(id, name) {
  if (!confirmAction(`Delete template "${name}"?`)) return;
  const r = await API.del(`/api/templates/${id}`);
  if (r.success) { showToast('Deleted', 'success'); loadTemplates(); }
  else showToast(r.message || 'Error', 'error');
}
