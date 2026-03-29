// frontend/js/pages/customers.js

async function renderCustomers() {
  document.getElementById('pageTitle').textContent = 'Customers';
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Customers</div>
        <div class="page-sub">Manage your customer database</div>
      </div>
      <button class="btn btn-primary" id="addCustomerBtn">➕ Add Customer</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="custSearch" placeholder="Search name, phone, email…" />
        </div>
        <select id="custCategory" style="width:150px">
          <option value="">All Categories</option>
        </select>
        <select id="custConsent" style="width:150px">
          <option value="">All Consent</option>
          <option value="1">Consented</option>
          <option value="0">Not Consented</option>
        </select>
      </div>
      <div class="table-wrap" id="custTable">Loading…</div>
    </div>`;

  document.getElementById('addCustomerBtn').onclick = () => openCustomerForm(null);

  // Load categories
  const catRes = await API.get('/api/customers/categories');
  if (catRes.success) {
    const sel = document.getElementById('custCategory');
    catRes.data.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }

  const load = () => loadCustomers();
  document.getElementById('custSearch').addEventListener('input', debounce(load, 350));
  document.getElementById('custCategory').addEventListener('change', load);
  document.getElementById('custConsent').addEventListener('change', load);

  await loadCustomers();
}

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function loadCustomers() {
  const search   = document.getElementById('custSearch')?.value || '';
  const category = document.getElementById('custCategory')?.value || '';
  const consented= document.getElementById('custConsent')?.value;
  const params   = new URLSearchParams();
  if (search)   params.set('search', search);
  if (category) params.set('category', category);
  if (consented !== '' && consented !== undefined) params.set('consented', consented);

  const res = await API.get(`/api/customers?${params}`);
  const tbl = document.getElementById('custTable');
  if (!tbl) return;

  if (!res.success || res.data.length === 0) {
    tbl.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No customers found.</p></div>`;
    return;
  }

  tbl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Phone</th><th>Category</th>
          <th>Consented</th><th>Added</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${res.data.map(c => `
          <tr>
            <td><strong>${esc(c.full_name)}</strong>${c.email ? `<br><span class="text-muted">${esc(c.email)}</span>` : ''}</td>
            <td><span style="font-family:var(--mono);font-size:0.82rem">${esc(c.phone)}</span></td>
            <td><span class="badge badge-blue">${esc(c.category)}</span></td>
            <td>${consentBadge(c.consented)}</td>
            <td class="text-muted">${fmtDateOnly(c.created_at)}</td>
            <td>
              <div class="flex-row">
                <button class="btn btn-ghost btn-sm" onclick="openCustomerForm(${c.id})">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id}, '${esc(c.full_name)}')">🗑</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function openCustomerForm(id) {
  let customer = null;
  if (id) {
    const r = await API.get(`/api/customers/${id}`);
    if (r.success) customer = r.data;
  }

  const catRes = await API.get('/api/customers/categories');
  const knownCats = catRes.success ? catRes.data : ['general', 'vip', 'wholesale'];
  const catOptions = [...new Set([...knownCats, 'general', 'vip', 'wholesale'])]
    .map(c => `<option value="${esc(c)}" ${customer?.category === c ? 'selected' : ''}>${esc(c)}</option>`)
    .join('');

  openModal(`
    <div class="modal-title">${customer ? '✏️ Edit Customer' : '➕ Add Customer'}</div>
    <div class="form-grid">
      <div class="form-group">
        <label>Full Name *</label>
        <input id="cf_name" type="text" value="${esc(customer?.full_name || '')}" placeholder="e.g. Priya Sharma" />
      </div>
      <div class="form-group">
        <label>Phone (with country code) *</label>
        <input id="cf_phone" type="text" value="${esc(customer?.phone || '')}" placeholder="+919876543210" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="cf_email" type="email" value="${esc(customer?.email || '')}" placeholder="email@example.com" />
      </div>
      <div class="form-group">
        <label>Gender</label>
        <select id="cf_gender">
          <option value="">Select</option>
          ${['male','female','other'].map(g => `<option value="${g}" ${customer?.gender===g?'selected':''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label>Address</label>
        <input id="cf_address" type="text" value="${esc(customer?.address || '')}" placeholder="City, State" />
      </div>
      <div class="form-group">
        <label>Category / Tag</label>
        <select id="cf_category">
          ${catOptions}
        </select>
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea id="cf_notes" rows="2">${esc(customer?.notes || '')}</textarea>
      </div>
      <div class="form-group full">
        <div class="checkbox-row">
          <input type="checkbox" id="cf_consented" ${customer?.consented ? 'checked' : ''} />
          <label for="cf_consented" style="text-transform:none;font-size:0.88rem">
            Customer consents to receive promotional WhatsApp messages
          </label>
        </div>
      </div>
    </div>
    <div class="flex-row mt-16">
      <button class="btn btn-primary" id="saveCustomerBtn">${customer ? 'Save Changes' : 'Add Customer'}</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `);

  document.getElementById('saveCustomerBtn').onclick = async () => {
    const body = {
      full_name:  document.getElementById('cf_name').value.trim(),
      phone:      document.getElementById('cf_phone').value.trim(),
      email:      document.getElementById('cf_email').value.trim(),
      gender:     document.getElementById('cf_gender').value,
      address:    document.getElementById('cf_address').value.trim(),
      category:   document.getElementById('cf_category').value,
      notes:      document.getElementById('cf_notes').value.trim(),
      consented:  document.getElementById('cf_consented').checked ? 1 : 0,
    };
    if (!body.full_name || !body.phone) {
      showToast('Name and phone are required', 'error'); return;
    }
    const r = customer
      ? await API.put(`/api/customers/${customer.id}`, body)
      : await API.post('/api/customers', body);

    if (r.success) {
      showToast(customer ? 'Customer updated!' : 'Customer added!', 'success');
      closeModal();
      loadCustomers();
    } else {
      showToast(r.message || 'Error saving customer', 'error');
    }
  };
}

async function deleteCustomer(id, name) {
  if (!confirmAction(`Delete customer "${name}"? This cannot be undone.`)) return;
  const r = await API.del(`/api/customers/${id}`);
  if (r.success) { showToast('Customer deleted', 'success'); loadCustomers(); }
  else showToast(r.message || 'Error', 'error');
}
