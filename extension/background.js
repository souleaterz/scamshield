// Keep in sync with config.js (which the popup uses).
const GUARDURAI_API = "https://guardurai.com";

// In-memory cache for passive checks: domain → { result, expires }.
// Service workers can restart, clearing this cache — that's fine, passive checks are cheap.
const passiveCache = new Map();

async function runPassiveCheck(url) {
  let domain;
  try { domain = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return { riskLevel: "safe" }; }

  const cached = passiveCache.get(domain);
  if (cached && Date.now() < cached.expires) return cached.result;

  try {
    const res = await fetch(`${GUARDURAI_API}/api/passive-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      credentials: "include",
    });
    const result = res.ok ? await res.json() : { riskLevel: "safe" };
    passiveCache.set(domain, { result, expires: Date.now() + 3_600_000 }); // 1h
    return result;
  } catch {
    return { riskLevel: "safe" };
  }
}

// Content scripts ask the service worker to make API calls (service workers
// bypass CORS for hosts in host_permissions; content scripts don't).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "passiveCheck") {
    runPassiveCheck(msg.url)
      .then(sendResponse)
      .catch(() => sendResponse({ riskLevel: "safe" }));
    return true;
  }

  if (msg.type === "analyzeText") {
    fetch(`${GUARDURAI_API}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text: msg.text }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          sendResponse({ ok: false, limitReached: true, error: data?.error });
        } else if (!res.ok) {
          sendResponse({ ok: false, error: data?.error ?? "Request failed" });
        } else {
          sendResponse({ ok: true, data });
        }
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

const MENU_ID = "guardurai-check";

function createMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Check "%s" with Guardurai',
      contexts: ["selection"],
    });
  });
}

// Create on install/update and on browser startup so the item is always present.
chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id || !info.selectionText) return;
  const tabId = tab.id;
  const text = info.selectionText;

  await paint(tabId, { state: "loading", site: GUARDURAI_API });

  try {
    const res = await fetch(`${GUARDURAI_API}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send Guardurai cookies so signed-in users get their plan (Pro/Unlimited);
      // falls back to an anonymous free check if not signed in.
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      await paint(tabId, { state: "limit", site: GUARDURAI_API });
    } else if (!res.ok) {
      await paint(tabId, {
        state: "error",
        site: GUARDURAI_API,
        error: data?.error || "Something went wrong.",
      });
    } else {
      await paint(tabId, { state: "result", site: GUARDURAI_API, verdict: data });
    }
  } catch {
    await paint(tabId, {
      state: "error",
      site: GUARDURAI_API,
      error: "Couldn't reach Guardurai. Check your connection.",
    });
  }
});

function paint(tabId, payload) {
  return chrome.scripting
    .executeScript({ target: { tabId }, func: renderOverlay, args: [payload] })
    .catch((err) => {
      // Some pages (e.g. chrome://, the Web Store, the new-tab page) block
      // injection. Log it so it's visible in the service worker console.
      console.warn("[Guardurai] could not show overlay on this page —", err);
    });
}

// Runs in the page (isolated world). Must be fully self-contained.
function renderOverlay(payload) {
  const HOST_ID = "__guardurai_overlay_host__";
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    // Set positioning with !important so page styles can't override or reset it.
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("top", "16px", "important");
    host.style.setProperty("right", "16px", "important");
    host.style.setProperty("z-index", "2147483647", "important");
    host.style.setProperty("margin", "0", "important");
    (document.documentElement || document.body).appendChild(host);
    host.attachShadow({ mode: "open" });
  }
  const shadow = host.shadowRoot;

  const COLORS = { safe: "#10b981", suspicious: "#f59e0b", likely_scam: "#ef4444" };
  const LABELS = { safe: "Safe", suspicious: "Suspicious", likely_scam: "Likely Scam" };

  function esc(s) {
    return String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  }

  const head = `<div class="row">
      <strong style="font-size:14px;">🛡️ Guardurai</strong>
      <button class="close" aria-label="Close">×</button>
    </div>`;

  let body;
  if (payload.state === "loading") {
    body = `${head}<p class="muted">Checking this for scams…</p>`;
  } else if (payload.state === "limit") {
    body = `${head}<p class="muted">You've used today's free check.
      <a href="${esc(payload.site)}" target="_blank" rel="noreferrer">Upgrade</a> for more.</p>`;
  } else if (payload.state === "error") {
    body = `${head}<p class="muted">${esc(payload.error)}</p>`;
  } else {
    const v = payload.verdict || {};
    const color = COLORS[v.risk_level] || "#64748b";
    const label = LABELS[v.risk_level] || v.risk_level || "Unknown";
    const flags = Array.isArray(v.red_flags)
      ? v.red_flags
          .slice(0, 3)
          .map((f) => `<div class="li"><span class="dot">•</span><span>${esc(f)}</span></div>`)
          .join("")
      : "";
    // Carry the full verdict to the site via the URL hash so it can show the
    // complete result without re-running (and re-charging) the check.
    let fullUrl = payload.site;
    try {
      fullUrl = `${payload.site}/#r=${encodeURIComponent(JSON.stringify(v))}`;
    } catch {
      fullUrl = payload.site;
    }
    body = `<div class="row">
        <span class="badge" style="background:${color};">${esc(label)}</span>
        <button class="close" aria-label="Close">×</button>
      </div>
      <p class="summary">${esc(v.summary)}</p>
      <div class="meta">Confidence ${esc(v.confidence)}% · ${esc(v.detected_type)}</div>
      ${flags ? `<div class="h">Red flags</div>${flags}` : ""}
      <div class="foot"><a href="${esc(fullUrl)}" target="_blank" rel="noreferrer">See full result on Guardurai →</a></div>`;
  }

  shadow.innerHTML = `<style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
    .card{width:320px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;
      box-shadow:0 12px 32px rgba(0,0,0,.18);padding:16px;color:#0f172a;}
    .row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .badge{font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;color:#fff;}
    .close{cursor:pointer;border:none;background:none;color:#94a3b8;font-size:20px;line-height:1;padding:0;}
    .summary{margin:12px 0 0;font-size:14px;line-height:1.45;}
    .meta{margin-top:6px;font-size:12px;color:#64748b;}
    .muted{margin:12px 0 0;font-size:14px;color:#475569;}
    .h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:14px 0 4px;}
    .li{display:flex;gap:6px;font-size:13px;margin:3px 0;}
    .dot{color:#ef4444;}
    .foot{margin-top:14px;font-size:12px;}
    a{color:#2563eb;text-decoration:none;}
  </style><div class="card">${body}</div>`;

  const closeBtn = shadow.querySelector(".close");
  if (closeBtn) closeBtn.addEventListener("click", () => host.remove());
}
