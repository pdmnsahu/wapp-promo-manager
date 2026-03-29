// frontend/js/app.js — SPA router and initialization

const PAGES = {
  dashboard: { fn: renderDashboard, title: 'Dashboard' },
  customers: { fn: renderCustomers, title: 'Customers' },
  occasions:  { fn: renderOccasions, title: 'Occasions' },
  templates:  { fn: renderTemplates, title: 'Templates' },
  compose:    { fn: renderCompose,   title: 'Send Messages' },
  logs:       { fn: renderLogs,      title: 'Message Logs' },
  settings:   { fn: renderSettings,  title: 'Settings' },
};

let currentPage = 'dashboard';

function navigateTo(page) {
  if (!PAGES[page]) return;
  currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.getElementById('pageTitle').textContent = PAGES[page].title;
  PAGES[page].fn();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// Nav click handlers
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(el.dataset.page);
  });
});

// Mobile menu toggle
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Start clock and load initial page
startClock();
navigateTo('dashboard');
