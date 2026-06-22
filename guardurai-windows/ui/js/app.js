/* Guardurai Windows App — SPA controller */

// ── State ─────────────────────────────────────────────────────────────────────
let _history = [];
let _historyFilter = 'all';
let _protectionActive = true;

// ── Boot — wait for pywebview API before initialising ─────────────────────────
let _domReady = false;
let _pyReady  = false;

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupLinkInterceptor();
  _domReady = true;
  _tryInit();
});

// pywebviewready fires when window.pywebview.api is available
window.addEventListener('pywebviewready', () => {
  _pyReady = true;
  _tryInit();
});

function _tryInit() {
  // In the browser (dev mode) there is no pywebview — init immediately
  const inPywebview = typeof window.pywebview !== 'undefined';
  if (_domReady && (_pyReady || !inPywebview)) {
    _init();
  }
}

async function _init() {
  await Promise.all([loadDashboard(), loadSettings(), loadAccount()]);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });
}

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el =>
    el.classList.toggle('active', el.id === `page-${page}`));
  if (page === 'history') loadHistory();
  if (page === 'dashboard') refreshStats();
}

// Open external links via Python so they go to the default browser,
// not inside the pywebview window.
function setupLinkInterceptor() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (a && /^https?:/.test(a.href)) {
      e.preventDefault();
      callPy('open_external', a.href);
    }
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  await Promise.all([refreshStats(), refreshStatus()]);
}

async function refreshStats() {
  const raw = await callPy('get_stats');
  if (!raw) return;
  const stats = JSON.parse(raw);
  setText('stat-today',   stats.today           ?? 0);
  setText('stat-threats', stats.threats_blocked ?? 0);
  setText('stat-total',   stats.total           ?? 0);

  const histRaw = await callPy('get_history');
  if (!histRaw) return;
  const items = JSON.parse(histRaw).slice(0, 5);
  const list = document.getElementById('recent-list');
  list.innerHTML = items.length
    ? items.map(activityItemHtml).join('')
    : '<div class="empty-state">No checks yet — copy a link or use the Check tab.</div>';
}

async function refreshStatus() {
  const raw = await callPy('get_protection_status');
  if (!raw) return;
  applyProtectionState(JSON.parse(raw).active);
}

function applyProtectionState(active) {
  _protectionActive = active;
  const headline = document.getElementById('status-headline');
  const sub      = document.getElementById('status-sub');
  const btn      = document.getElementById('toggle-btn');
  const card     = document.getElementById('status-card');
  const poly     = document.getElementById('shield-poly');
  const badge    = document.getElementById('sidebar-badge');
  const label    = badge?.querySelector('.badge-label');

  if (active) {
    headline.textContent = "You're protected";
    sub.textContent = 'Guardurai is actively monitoring your browsing and clipboard.';
    btn.textContent = 'Pause protection';
    card.style.borderColor = '';
    poly.setAttribute('fill', '#10b981');
    badge?.classList.remove('paused');
    if (label) label.textContent = 'Protected';
  } else {
    headline.textContent = 'Protection paused';
    sub.textContent = 'Real-time monitoring is off. Click Resume to re-enable.';
    btn.textContent = 'Resume protection';
    card.style.borderColor = '#ef4444';
    poly.setAttribute('fill', '#374151');
    badge?.classList.add('paused');
    if (label) label.textContent = 'Paused';
  }
}

async function toggleProtection() {
  const raw = await callPy('toggle_protection');
  if (!raw) return;
  applyProtectionState(JSON.parse(raw).active);
}

// ── Check (renamed from Scan) ─────────────────────────────────────────────────
async function runCheck() {
  const input = document.getElementById('scan-input');
  const text  = input.value.trim();
  if (!text) return;

  const btn     = document.getElementById('scan-btn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Checking…';

  const resultEl = document.getElementById('scan-result');
  resultEl.className = 'result-card hidden';

  const raw = await callPy('check', text);
  btn.disabled = false;
  btn.textContent = 'Check for scams';

  if (!raw) return;
  const result = JSON.parse(raw);

  resultEl.className = 'result-card';
  resultEl.innerHTML = result.error
    ? `<p style="color:var(--danger)">${escHtml(result.error)}</p>`
    : renderResult(result);
  refreshStats();
}

function clearCheck() {
  document.getElementById('scan-input').value = '';
  const r = document.getElementById('scan-result');
  r.className = 'result-card hidden';
  r.innerHTML = '';
}

function renderResult(result) {
  const risk  = result.risk_level ?? 'safe';
  const label = { likely_scam: 'Likely Scam', suspicious: 'Suspicious', safe: 'Safe' }[risk] ?? risk;
  const conf  = result.confidence_score != null
    ? `Confidence: ${Math.round(result.confidence_score * 100)}%` : '';
  const redFlags    = (result.red_flags    ?? []).map(f => `<li>${escHtml(f)}</li>`).join('');
  const safeSignals = (result.safe_signals ?? []).map(f => `<li>${escHtml(f)}</li>`).join('');
  return `
    <div class="result-header">
      <span class="result-badge ${risk}">${label}</span>
      <span class="result-confidence">${escHtml(conf)}</span>
    </div>
    ${result.summary ? `<p class="result-summary">${escHtml(result.summary)}</p>` : ''}
    ${redFlags    ? `<div class="result-section"><div class="result-section-title">Red flags</div><ul class="result-list red">${redFlags}</ul></div>` : ''}
    ${safeSignals ? `<div class="result-section"><div class="result-section-title">Safe signals</div><ul class="result-list green">${safeSignals}</ul></div>` : ''}
  `;
}

// ── History ───────────────────────────────────────────────────────────────────
async function loadHistory() {
  const raw = await callPy('get_history');
  if (!raw) return;
  _history = JSON.parse(raw);
  renderHistory();
}

function filterHistory(filter, btn) {
  _historyFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistory();
}

function renderHistory() {
  const list  = document.getElementById('history-list');
  const items = _historyFilter === 'all'
    ? _history
    : _history.filter(h => h.risk_level === _historyFilter);
  list.innerHTML = items.length
    ? items.map(historyItemHtml).join('')
    : '<div class="empty-state">No results for this filter.</div>';
}

function historyItemHtml(item) {
  const risk  = item.risk_level ?? 'safe';
  const label = { likely_scam: 'Scam', suspicious: 'Suspicious', safe: 'Safe' }[risk] ?? risk;
  const date  = item.checked_at ? new Date(item.checked_at).toLocaleString() : '';
  const src   = { clipboard: 'Clipboard', browser: 'Browser', manual: 'Manual' }[item.source] ?? item.source;
  const encoded = escHtml(JSON.stringify(JSON.stringify(item)));
  return `
    <div class="history-item" onclick="showDetail(${encoded})">
      <div class="risk-dot ${risk}"></div>
      <div class="hi-text">
        <div class="hi-input">${escHtml(item.input_text ?? '')}</div>
        <div class="hi-meta">${escHtml(date)}</div>
      </div>
      <span class="hi-source">${escHtml(src)}</span>
      <span class="risk-chip ${risk}">${escHtml(label)}</span>
    </div>`;
}

function showDetail(rawJson) {
  const item   = JSON.parse(rawJson);
  const result = item.result_json ?? {};
  document.getElementById('detail-content').innerHTML =
    `<h2 style="margin-bottom:16px;font-size:16px;word-break:break-all">${escHtml(item.input_text ?? '')}</h2>${renderResult(result)}`;
  document.getElementById('detail-overlay').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.add('hidden');
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const [rawS, rawA] = await Promise.all([callPy('get_settings'), callPy('is_autostart')]);
  if (rawS) {
    const s = JSON.parse(rawS);
    setCheck('s-browser',   s.check_browser   !== 'false');
    setCheck('s-clipboard', s.check_clipboard !== 'false');
    setCheck('s-notif',     s.notifications   !== 'false');
  }
  if (rawA) setCheck('s-autostart', JSON.parse(rawA).enabled);
}

function saveSetting(key, value) { callPy('save_settings', JSON.stringify({ [key]: String(value) })); }
async function setAutostart(enable) { await callPy('set_autostart', enable); }

// ── Account ───────────────────────────────────────────────────────────────────
async function loadAccount() {
  const raw = await callPy('get_account');
  if (!raw) return;
  const data = JSON.parse(raw);
  if (data.signed_in) {
    showAccountConnected(data);
  }
}

function showAccountConnected(data) {
  const name   = data.name || data.email || 'User';
  const tier   = data.tier || 'free';
  const labels = { free: 'Free Plan', pro: 'Pro Plan', family: 'Family Plan' };

  document.getElementById('account-avatar').textContent = name[0].toUpperCase();
  document.getElementById('account-name').textContent   = name;

  const badge = document.getElementById('account-tier-badge');
  badge.textContent  = labels[tier] ?? tier;
  badge.className    = `tier-badge tier-${tier}`;

  document.getElementById('account-connected').classList.remove('hidden');
  document.getElementById('account-disconnected').classList.add('hidden');
  document.getElementById('account-connect-form').classList.add('hidden');
}

function showAccountDisconnected() {
  document.getElementById('account-connected').classList.add('hidden');
  document.getElementById('account-disconnected').classList.remove('hidden');
  document.getElementById('account-connect-form').classList.remove('hidden');
}

function openSignIn() {
  callPy('open_external', 'https://guardurai.com/sign-in');
}

async function linkAccount() {
  const email = document.getElementById('account-email-input').value.trim();
  const errEl = document.getElementById('account-error');
  errEl.classList.add('hidden');

  if (!email) { showError('Please enter your email address.'); return; }

  const btn = document.getElementById('connect-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const raw = await callPy('link_account', email);
  btn.disabled = false;
  btn.textContent = 'Connect';

  if (!raw) return;
  const data = JSON.parse(raw);
  if (data.error) {
    showError(data.error === 'not_found'
      ? 'No Guardurai account found for that email. Sign up at guardurai.com first.'
      : data.error);
    return;
  }
  showAccountConnected(data);
}

async function unlinkAccount() {
  await callPy('unlink_account');
  showAccountDisconnected();
}

function showError(msg) {
  const el = document.getElementById('account-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Real-time protection callback (called by app.py via evaluate_js) ──────────
window.__onProtectionResult = function({ result }) {
  refreshStats();
  // Flash the nav if threat detected
  if (result.risk_level === 'likely_scam' || result.risk_level === 'suspicious') {
    const dot = document.querySelector('#sidebar-badge .badge-dot');
    if (dot) { dot.style.background = 'var(--danger)'; setTimeout(() => { dot.style.background = ''; }, 3000); }
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function activityItemHtml(item) {
  const risk  = item.risk_level ?? 'safe';
  const label = { likely_scam: 'Scam', suspicious: 'Suspicious', safe: 'Safe' }[risk] ?? risk;
  const date  = item.checked_at ? new Date(item.checked_at).toLocaleString() : '';
  return `
    <div class="activity-item">
      <div class="risk-dot ${risk}"></div>
      <div class="activity-text">
        <div class="activity-input">${escHtml(item.input_text ?? '')}</div>
        <div class="activity-meta">${escHtml(date)}</div>
      </div>
      <span class="risk-chip ${risk}">${escHtml(label)}</span>
    </div>`;
}

async function callPy(method, ...args) {
  try {
    if (window.pywebview?.api) return await window.pywebview.api[method](...args);
    return _mockPy(method, args);
  } catch (e) {
    console.error(`callPy(${method}):`, e);
    return null;
  }
}

// Dev-mode mocks — empty data so UI shows real empty states
function _mockPy(method, args) {
  const mocks = {
    get_stats:            () => JSON.stringify({ today: 0, threats_blocked: 0, total: 0 }),
    get_protection_status:() => JSON.stringify({ active: true }),
    get_history:          () => JSON.stringify([]),
    get_settings:         () => JSON.stringify({ check_browser: 'true', check_clipboard: 'true', notifications: 'true' }),
    is_autostart:         () => JSON.stringify({ enabled: false }),
    get_account:          () => JSON.stringify({ signed_in: false }),
    toggle_protection:    () => JSON.stringify({ active: !_protectionActive }),
    check: () => {
      const text = (args && args[0]) ?? '';
      if (text.includes('scam') || text.includes('.tk') || text.includes('verify')) {
        return JSON.stringify({ risk_level: 'likely_scam', confidence_score: 0.95, summary: 'This looks like a scam.', red_flags: ['Suspicious domain pattern'], safe_signals: [] });
      }
      return JSON.stringify({ risk_level: 'safe', confidence_score: 0.88, summary: 'No immediate threats detected.', red_flags: [], safe_signals: ['No known threat indicators'] });
    },
    link_account: () => {
      const email = (args && args[0]) ?? '';
      return JSON.stringify({ signed_in: true, email, name: email.split('@')[0], tier: 'free' });
    },
    save_settings:  () => JSON.stringify({ ok: true }),
    set_autostart:  () => JSON.stringify({ ok: true }),
    open_external:  () => JSON.stringify({ ok: true }),
    unlink_account: () => JSON.stringify({ ok: true }),
  };
  const fn = mocks[method];
  return fn ? fn() : JSON.stringify({});
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setCheck(id, val) { const el = document.getElementById(id); if (el) el.checked = val; }
function escHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
