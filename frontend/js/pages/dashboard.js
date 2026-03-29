// frontend/js/pages/dashboard.js

async function renderDashboard() {
  document.getElementById('pageTitle').textContent = 'Dashboard';
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading-screen">Loading dashboard…</div>`;

  const res = await API.get('/api/messages/dashboard');
  if (!res.success) { content.innerHTML = `<p class="text-red">Failed to load dashboard.</p>`; return; }
  const d = res.data;

  content.innerHTML = `
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${d.totalCustomers}</div>
        <div class="stat-label">Total Customers</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${d.consentedCustomers}</div>
        <div class="stat-label">Consented</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">📤</div>
        <div class="stat-value">${d.totalSent}</div>
        <div class="stat-label">Messages Sent</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon">❌</div>
        <div class="stat-value">${d.totalFailed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${d.totalPending}</div>
        <div class="stat-label">Pending / Manual</div>
      </div>
    </div>

    <div class="two-col">
      <!-- Today & Upcoming Occasions -->
      <div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">🎉 Today's Occasions</span>
          </div>
          ${d.todayOccasions.length === 0
            ? '<p class="text-muted">No special occasions today.</p>'
            : `<div class="occasion-list">${d.todayOccasions.map(o => `
                <div class="occasion-item">
                  <div>
                    <div class="occasion-name">${esc(o.name)}</div>
                    <div class="occasion-date">${o.occasion_date}</div>
                  </div>
                  ${o.messaging_on ? '<span class="badge badge-green">Messaging ON</span>' : '<span class="badge badge-gray">Messaging OFF</span>'}
                </div>`).join('')}
              </div>`}
        </div>

        <div class="card mt-16">
          <div class="card-header">
            <span class="card-title">📅 Upcoming (7 days)</span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('occasions')">View All</button>
          </div>
          ${d.upcomingOccasions.length === 0
            ? '<p class="text-muted">Nothing in the next 7 days.</p>'
            : `<div class="occasion-list">${d.upcomingOccasions.map(o => `
                <div class="occasion-item">
                  <div>
                    <div class="occasion-name">${esc(o.name)}</div>
                    <div class="occasion-date">${o.next_date}</div>
                  </div>
                  ${daysAwayBadge(o.days_away)}
                </div>`).join('')}
              </div>`}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 Recent Activity</span>
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('logs')">View Logs</button>
        </div>
        ${d.recentLogs.length === 0
          ? '<p class="text-muted">No messages sent yet.</p>'
          : `<div class="activity-feed">${d.recentLogs.map(l => `
              <div class="activity-item">
                <div class="activity-dot ${l.status}"></div>
                <div>
                  <div class="activity-text"><strong>${esc(l.customer_name)}</strong> · ${esc(l.occasion_name)}</div>
                  <div class="activity-time">${fmtDate(l.sent_at)} · ${statusBadge(l.status)}</div>
                </div>
              </div>`).join('')}
            </div>`}
      </div>
    </div>

    <!-- Quick Links -->
    <div class="card mt-24">
      <div class="card-header"><span class="card-title">⚡ Quick Actions</span></div>
      <div class="flex-row flex-wrap">
        <button class="btn btn-primary" onclick="navigateTo('customers')">➕ Add Customer</button>
        <button class="btn btn-ghost"   onclick="navigateTo('compose')">📤 Send Messages</button>
        <button class="btn btn-ghost"   onclick="navigateTo('occasions')">🎉 Manage Occasions</button>
        <button class="btn btn-ghost"   onclick="navigateTo('templates')">✉️ Edit Templates</button>
        <button class="btn btn-warning" id="triggerBtn">▶ Run Scheduler Now</button>
      </div>
    </div>
  `;

  document.getElementById('triggerBtn').addEventListener('click', async () => {
    const btn = document.getElementById('triggerBtn');
    btn.disabled = true; btn.textContent = 'Running…';
    const r = await API.post('/api/messages/trigger', {});
    btn.disabled = false; btn.textContent = '▶ Run Scheduler Now';
    if (r.success) {
      showToast(`Scheduler done! Processed: ${r.data.processed}, Skipped: ${r.data.skipped}`, 'success');
      renderDashboard();
    } else {
      showToast(r.message || 'Scheduler error', 'error');
    }
  });
}
