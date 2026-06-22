/* Guardurai Windows App — SPA controller */

let _history = [];
let _historyFilter = 'all';
let _protectionActive = true;
let _pollTimer = null;

// ── Boot — wait for the pywebview API before initialising ─────────────────────
let _domReady = false, _pyReady = false;

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  _domReady = true;
  _tryInit();
});
window.addEventListener('pywebviewready', () => { _pyReady = true; _tryInit(); });

function _tryInit() {
  const inPywebview = typeof window.pywebview !== 'undefined';
  if (_domReady && (_pyReady || !inPywebview)) _init();
}
async function _init() {
  await Promise.all([loadDashboard(), loadSettings(), loadAccount()]);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item =>
    item.addEventListener('click', () => navigate(item.dataset.page)));
}
function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el =>
    el.classList.toggle('active', el.id === `page-${page}`));
  if (page === 'history') loadHistory();
  if (page === 'dashboard') refreshStats();
  document.querySelector('.content').scrollTop = 0;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() { await Promise.all([refreshStats(), refreshStatus()]); }

async function refreshStats() {
  const raw = await callPy('get_stats');
  if (raw) {
    const s = JSON.parse(raw);
    setText('stat-today', s.today ?? 0);
    setText('stat-threats', s.threats_blocked ?? 0);
    setText('stat-total', s.total ?? 0);
  }
  const histRaw = await callPy('get_history');
  if (!histRaw) return;
  const items = JSON.parse(histRaw).slice(0, 5);
  const list = document.getElementById('recent-list');
  list.innerHTML = items.length
    ? items.map(activityItemHtml).join('')
    : '<div class="empty-state"><div class="empty-icon">🛡️</div><div>No checks yet — you\'re all clear. Copy a link or use the Check tab.</div></div>';
}

async function refreshStatus() {
  const raw = await callPy('get_protection_status');
  if (raw) applyProtectionState(JSON.parse(raw).active);
}

function applyProtectionState(active) {
  _protectionActive = active;
  const $ = id => document.getElementById(id);
  const glow = $('status-glow');
  if (active) {
    $('status-headline').textContent = "You're protected";
    $('status-sub').textContent = 'Guardurai is actively monitoring your browsing and clipboard.';
    $('toggle-btn').textContent = 'Pause';
    $('status-card').style.borderColor = '';
    $('shield-poly').setAttribute('fill', '#10b981');
    if (glow) glow.style.background = 'radial-gradient(circle, rgba(16,185,129,.22), transparent 65%)';
    $('sidebar-badge').classList.remove('paused');
    $('sidebar-badge').querySelector('.badge-label').textContent = 'Protected';
  } else {
    $('status-headline').textContent = 'Protection paused';
    $('status-sub').textContent = 'Real-time monitoring is off. Click Resume to re-enable.';
    $('toggle-btn').textContent = 'Resume';
    $('status-card').style.borderColor = 'rgba(239,68,68,.4)';
    $('shield-poly').setAttribute('fill', '#4b5563');
    if (glow) glow.style.background = 'radial-gradient(circle, rgba(239,68,68,.18), transparent 65%)';
    $('sidebar-badge').classList.add('paused');
    $('sidebar-badge').querySelector('.badge-label').textContent = 'Paused';
  }
}

async function toggleProtection() {
  const raw = await callPy('toggle_protection');
  if (raw) applyProtectionState(JSON.parse(raw).active);
}

// ── Check ─────────────────────────────────────────────────────────────────────
async function runCheck() {
  const text = document.getElementById('scan-input').value.trim();
  if (!text) return;
  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Checking…';
  const resultEl = document.getElementById('scan-result');
  resultEl.className = 'result-card hidden';

  const raw = await callPy('check', text);
  btn.disabled = false;
  btn.innerHTML = 'Check for scams';
  if (!raw) return;
  const result = JSON.parse(raw);

  if (result.error) {
    resultEl.className = 'result-card';
    resultEl.innerHTML = `<p style="color:var(--danger)">${escHtml(result.error)}</p>`;
    return;
  }
  resultEl.className = `result-card risk-${result.risk_level ?? 'safe'}`;
  resultEl.innerHTML = renderResult(result);
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
  const label = { likely_scam: 'Likely Scam', suspicious: 'Suspicious', safe: 'Looks Safe' }[risk] ?? risk;
  // API returns `confidence` as 0–100.
  const conf  = typeof result.confidence === 'number' ? `${Math.round(result.confidence)}% confident` : '';
  const redFlags = (result.red_flags ?? []).map(f => `<li>${escHtml(f)}</li>`).join('');
  const advice   = (result.advice ?? []).map(f => `<li>${escHtml(f)}</li>`).join('');

  return `
    <div class="result-header">
      <span class="result-badge ${risk}">${label}</span>
      <span class="result-confidence">${escHtml(conf)}</span>
    </div>
    ${result.summary ? `<p class="result-summary">${escHtml(result.summary)}</p>` : ''}
    ${result.explanation ? `<p class="result-explanation">${escHtml(result.explanation)}</p>` : ''}
    ${redFlags ? `<div class="result-section"><div class="result-section-title">⚠ Warning signs</div><ul class="result-list red">${redFlags}</ul></div>` : ''}
    ${advice   ? `<div class="result-section"><div class="result-section-title">✓ What to do</div><ul class="result-list blue">${advice}</ul></div>` : ''}
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
  const list = document.getElementById('history-list');
  const items = _historyFilter === 'all' ? _history : _history.filter(h => h.risk_level === _historyFilter);
  list.innerHTML = items.length
    ? items.map(historyItemHtml).join('')
    : '<div class="empty-state"><div class="empty-icon">📭</div><div>No checks in this category yet.</div></div>';
}
function historyItemHtml(item) {
  const risk  = item.risk_level ?? 'safe';
  const label = { likely_scam: 'Scam', suspicious: 'Suspicious', safe: 'Safe' }[risk] ?? risk;
  const date  = item.checked_at ? new Date(item.checked_at).toLocaleString() : '';
  const src   = { clipboard: 'Clipboard', browser: 'Browser', manual: 'Manual' }[item.source] ?? item.source;
  return `
    <div class="history-item" onclick="showDetail(${escHtml(JSON.stringify(JSON.stringify(item)))})">
      <div class="risk-dot ${risk}"></div>
      <div class="hi-text"><div class="hi-input">${escHtml(item.input_text ?? '')}</div><div class="hi-meta">${escHtml(date)}</div></div>
      <span class="hi-source">${escHtml(src)}</span>
      <span class="risk-chip ${risk}">${escHtml(label)}</span>
    </div>`;
}
function showDetail(rawJson) {
  const item = JSON.parse(rawJson);
  document.getElementById('detail-content').innerHTML =
    `<h2 style="margin-bottom:18px;font-size:16px;word-break:break-all">${escHtml(item.input_text ?? '')}</h2>${renderResult(item.result_json ?? {})}`;
  document.getElementById('detail-overlay').classList.remove('hidden');
}
function closeDetail() { document.getElementById('detail-overlay').classList.add('hidden'); }

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

// ── Account (device pairing) ──────────────────────────────────────────────────
async function loadAccount() {
  const raw = await callPy('get_account');
  if (!raw) return;
  const data = JSON.parse(raw);
  data.signed_in ? showAccountConnected(data) : showAccountDisconnected();
}

function showAccountConnected(data) {
  stopPolling();
  const name = data.name || 'Account';
  const tier = data.tier || 'free';
  const labels = { free: 'Free Plan', pro: 'Pro Plan', family: 'Family Plan' };
  const initial = name[0].toUpperCase();

  document.getElementById('account-avatar').textContent = initial;
  document.getElementById('account-name').textContent = name;
  const badge = document.getElementById('account-tier-badge');
  badge.textContent = labels[tier] ?? tier;
  badge.className = `tier-badge tier-${tier}`;

  // Sidebar chip
  document.getElementById('chip-avatar').textContent = initial;
  document.getElementById('chip-name').textContent = name;
  document.getElementById('chip-tier').textContent = labels[tier] ?? tier;

  toggleAccountCards('connected');
}

function showAccountDisconnected() {
  document.getElementById('chip-avatar').textContent = '?';
  document.getElementById('chip-name').textContent = 'Not signed in';
  document.getElementById('chip-tier').textContent = 'Free plan';
  toggleAccountCards('disconnected');
}

function toggleAccountCards(state) {
  document.getElementById('account-connected').classList.toggle('hidden', state !== 'connected');
  document.getElementById('account-disconnected').classList.toggle('hidden', state !== 'disconnected');
  document.getElementById('account-pairing').classList.toggle('hidden', state !== 'pairing');
}

async function startLink() {
  const btn = document.getElementById('link-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  const raw = await callPy('start_link');
  btn.disabled = false;
  btn.textContent = 'Sign in / Link account';
  if (!raw) return;
  const data = JSON.parse(raw);
  if (data.error || !data.code) return;

  document.getElementById('pairing-code').textContent = data.code;
  toggleAccountCards('pairing');
  callPy('open_external', 'https://guardurai.com/link');
  startPolling(data.token);
}

function startPolling(token) {
  stopPolling();
  _pollTimer = setInterval(async () => {
    const raw = await callPy('poll_link', token);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.signed_in) showAccountConnected(data);
  }, 3000);
}
function stopPolling() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

function cancelLink() { stopPolling(); showAccountDisconnected(); }
function openLinkPage() { callPy('open_external', 'https://guardurai.com/link'); }

async function unlinkAccount() {
  await callPy('unlink_account');
  showAccountDisconnected();
}

// ── Real-time protection callback (called by app.py via evaluate_js) ──────────
window.__onProtectionResult = function({ result }) {
  refreshStats();
  const risk = result.risk_level;
  if (risk === 'likely_scam' || risk === 'suspicious') {
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
      <div class="activity-text"><div class="activity-input">${escHtml(item.input_text ?? '')}</div><div class="activity-meta">${escHtml(date)}</div></div>
      <span class="risk-chip ${risk}">${escHtml(label)}</span>
    </div>`;
}

async function callPy(method, ...args) {
  try {
    if (window.pywebview?.api) return await window.pywebview.api[method](...args);
    return _mockPy(method, args);
  } catch (e) { console.error(`callPy(${method}):`, e); return null; }
}

function _mockPy(method, args) {
  const mocks = {
    get_stats:             () => JSON.stringify({ today: 0, threats_blocked: 0, total: 0 }),
    get_protection_status: () => JSON.stringify({ active: true }),
    get_history:           () => JSON.stringify([]),
    get_settings:          () => JSON.stringify({ check_browser: 'true', check_clipboard: 'true', notifications: 'true' }),
    is_autostart:          () => JSON.stringify({ enabled: false }),
    get_account:           () => JSON.stringify({ signed_in: false }),
    toggle_protection:     () => JSON.stringify({ active: !_protectionActive }),
    start_link:            () => JSON.stringify({ code: 'AB3K9P', token: 'devtoken' }),
    poll_link:             () => JSON.stringify({ signed_in: false }),
    check: () => {
      const text = (args && args[0]) ?? '';
      if (/scam|\.tk|verify|prize|gift card/i.test(text)) {
        return JSON.stringify({ risk_level: 'likely_scam', confidence: 94, summary: 'This looks like a scam.', explanation: 'It uses urgency and a suspicious link to pressure you into acting fast.', red_flags: ['Suspicious link', 'Urgency / pressure tactics'], advice: ['Do not click any links', 'Do not reply or share details', 'Report and delete it'] });
      }
      return JSON.stringify({ risk_level: 'safe', confidence: 88, summary: 'No immediate threats detected.', explanation: 'Nothing here matches common scam patterns.', red_flags: [], advice: ['Stay alert for anything asking for money or details'] });
    },
    save_settings:  () => JSON.stringify({ ok: true }),
    set_autostart:  () => JSON.stringify({ ok: true }),
    open_external:  () => JSON.stringify({ ok: true }),
    unlink_account: () => JSON.stringify({ ok: true }),
  };
  const fn = mocks[method];
  return fn ? fn() : JSON.stringify({});
}

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function setCheck(id, v) { const el = document.getElementById(id); if (el) el.checked = v; }
function escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
