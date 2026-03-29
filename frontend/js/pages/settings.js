// frontend/js/pages/settings.js

async function renderSettings() {
  document.getElementById('pageTitle').textContent = 'Settings';
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading-screen">Loading settings…</div>`;

  const res = await API.get('/api/settings');
  if (!res.success) { content.innerHTML = '<p class="text-red">Failed to load settings.</p>'; return; }
  const s = res.data;

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title">Settings</div>
      <div class="page-sub">Configure your business details, WhatsApp mode, and scheduler</div>
    </div>

    <!-- Business Info -->
    <div class="card">
      <div class="card-header"><span class="card-title">🏪 Business Details</span></div>
      <div class="form-grid">
        <div class="form-group">
          <label>Business Name</label>
          <input id="s_bname" type="text" value="${esc(s.business_name || '')}" placeholder="My Business" />
        </div>
        <div class="form-group">
          <label>Business Phone</label>
          <input id="s_bphone" type="text" value="${esc(s.business_phone || '')}" placeholder="+910000000000" />
        </div>
        <div class="form-group">
          <label>Default Discount Text</label>
          <input id="s_discount" type="text" value="${esc(s.default_discount || '')}" placeholder="20% OFF" />
        </div>
        <div class="form-group">
          <label>Default Offer Expiry</label>
          <input id="s_expiry" type="text" value="${esc(s.default_expiry || '')}" placeholder="3 days" />
        </div>
      </div>
    </div>

    <!-- WhatsApp Mode -->
    <div class="card mt-16">
      <div class="card-header"><span class="card-title">📲 WhatsApp Sending Mode</span></div>
      <div class="form-group" style="max-width:280px;margin-bottom:20px">
        <label>Mode</label>
        <select id="s_mode">
          <option value="manual" ${s.send_mode==='manual'?'selected':''}>Manual / Click-to-Chat</option>
          <option value="api"    ${s.send_mode==='api'?'selected':''}>API (Auto Send)</option>
        </select>
      </div>

      <div id="apiSection" style="${s.send_mode!=='api'?'opacity:0.4;pointer-events:none':''}">
        <p class="text-muted" style="margin-bottom:14px;font-size:0.83rem">
          Supported providers: <strong>ultramsg</strong>, <strong>twilio</strong>, or any custom endpoint.
        </p>
        <div class="form-grid">
          <div class="form-group">
            <label>Provider</label>
            <select id="s_provider">
              <option value=""        ${!s.api_provider?'selected':''}>Select…</option>
              <option value="ultramsg"${s.api_provider==='ultramsg'?'selected':''}>UltraMsg</option>
              <option value="twilio"  ${s.api_provider==='twilio'?'selected':''}>Twilio</option>
              <option value="custom"  ${s.api_provider==='custom'?'selected':''}>Custom Endpoint</option>
            </select>
          </div>
          <div class="form-group">
            <label>Instance ID / Account SID</label>
            <input id="s_instance" type="text" value="${esc(s.api_instance_id || '')}" placeholder="instance123" />
          </div>
          <div class="form-group">
            <label>API Token / Auth Token</label>
            <input id="s_token" type="password" value="${esc(s.api_token || '')}" placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label>Custom API Endpoint (if provider = custom)</label>
            <input id="s_endpoint" type="text" value="${esc(s.api_endpoint || '')}" placeholder="https://yourapi.com/send" />
          </div>
        </div>
      </div>
    </div>

    <!-- Scheduler -->
    <div class="card mt-16">
      <div class="card-header"><span class="card-title">⏰ Scheduler</span></div>
      <div class="form-grid">
        <div class="form-group">
          <label>Daily Run Time (IST)</label>
          <input id="s_schtime" type="time" value="${esc(s.scheduler_time || '09:00')}" />
        </div>
        <div class="form-group">
          <label>Auto-Send Behavior</label>
          <select id="s_autosend">
            <option value="0" ${s.auto_send!=='1'?'selected':''}>Prepare links only (manual approval)</option>
            <option value="1" ${s.auto_send==='1'?'selected':''}>Auto-send via API (if API mode enabled)</option>
          </select>
        </div>
      </div>
      <p class="text-muted mt-16" style="font-size:0.82rem">
        The scheduler runs daily at the configured time, checks today's occasions, and prepares or sends
        messages to all consented customers. Duplicate sends on the same day are blocked automatically.
      </p>
    </div>

    <div class="flex-row mt-24">
      <button class="btn btn-primary" id="saveSettingsBtn">💾 Save Settings</button>
    </div>
  `;

  // Toggle API section opacity based on mode
  document.getElementById('s_mode').addEventListener('change', e => {
    const sec = document.getElementById('apiSection');
    sec.style.opacity = e.target.value === 'api' ? '1' : '0.4';
    sec.style.pointerEvents = e.target.value === 'api' ? 'auto' : 'none';
  });

  document.getElementById('saveSettingsBtn').onclick = async () => {
    const body = {
      business_name:   document.getElementById('s_bname').value.trim(),
      business_phone:  document.getElementById('s_bphone').value.trim(),
      default_discount:document.getElementById('s_discount').value.trim(),
      default_expiry:  document.getElementById('s_expiry').value.trim(),
      send_mode:       document.getElementById('s_mode').value,
      api_provider:    document.getElementById('s_provider').value,
      api_instance_id: document.getElementById('s_instance').value.trim(),
      api_token:       document.getElementById('s_token').value.trim(),
      api_endpoint:    document.getElementById('s_endpoint').value.trim(),
      scheduler_time:  document.getElementById('s_schtime').value,
      auto_send:       document.getElementById('s_autosend').value,
    };
    const r = await API.post('/api/settings', body);
    if (r.success) showToast('Settings saved!', 'success');
    else showToast(r.message || 'Error saving settings', 'error');
  };
}
