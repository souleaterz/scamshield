// Elements
const passiveToggle = document.getElementById("passive-toggle");
const passiveSub    = document.getElementById("passive-sub");
const shotBtn       = document.getElementById("shot");
const resultEl      = document.getElementById("result");
const authText      = document.getElementById("auth-text");
const authBtn       = document.getElementById("auth-btn");

const COLORS = { safe: "#10b981", suspicious: "#f59e0b", likely_scam: "#ef4444" };
const LABELS = { safe: "Safe", suspicious: "Suspicious", likely_scam: "Likely Scam" };

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

// ── Protection stats ──────────────────────────────────────────────────────────

chrome.storage.local.get({ statProtected: 0, statBlocked: 0 }, (s) => {
  const p = document.getElementById("stat-protected");
  const b = document.getElementById("stat-blocked");
  if (p) p.textContent = (s.statProtected || 0).toLocaleString();
  if (b) b.textContent = (s.statBlocked || 0).toLocaleString();
});

// Nudge the background worker to sync our local protection stats to the global
// counter whenever the popup is opened.
try {
  chrome.runtime.sendMessage({ type: "flushStats" });
} catch (e) {
  /* ignore */
}

// ── Passive protection toggle ─────────────────────────────────────────────────

chrome.storage.local.get({ passiveEnabled: true }, ({ passiveEnabled }) => {
  passiveToggle.checked = passiveEnabled;
  updateSubText(passiveEnabled);
});

passiveToggle.addEventListener("change", () => {
  const enabled = passiveToggle.checked;
  chrome.storage.local.set({ passiveEnabled: enabled });
  updateSubText(enabled);
});

function updateSubText(enabled) {
  passiveSub.textContent = enabled
    ? "Warns you on risky pages automatically"
    : "Passive warnings are paused";
}

// ── Scan this page ────────────────────────────────────────────────────────────

function show(html) {
  resultEl.innerHTML = html;
  resultEl.style.display = "block";
}

function fullResultUrl(verdict) {
  try {
    return `${GUARDURAI_API}/#r=${encodeURIComponent(JSON.stringify(verdict))}`;
  } catch {
    return GUARDURAI_API;
  }
}

function renderVerdict(data) {
  const color = COLORS[data.risk_level] || "#64748b";
  const label = LABELS[data.risk_level] || data.risk_level || "Unknown";
  const flags = Array.isArray(data.red_flags)
    ? data.red_flags
        .slice(0, 3)
        .map((f) => `<div class="r-flag"><span class="r-dot">•</span>${esc(f)}</div>`)
        .join("")
    : "";
  // Locked = free user; the AI explanation + advice are held back for Pro.
  const footer = data.locked
    ? `<div class="r-meta" style="margin-top:10px;">🔒 ` +
      `<a class="r-link" href="${esc(GUARDURAI_API)}/pricing?ref=ext-locked" target="_blank" rel="noreferrer">` +
      `Unlock why it's risky &amp; what to do →</a></div>`
    : `<div class="r-meta" style="margin-top:8px;">` +
      `<a class="r-link" href="${esc(fullResultUrl(data))}" target="_blank" rel="noreferrer">See full result →</a></div>`;
  show(
    `<span class="badge" style="background:${color};">${esc(label)}</span>` +
      `<p class="r-summary">${esc(data.summary)}</p>` +
      `<div class="r-meta">Confidence ${esc(data.confidence)}% · ${esc(data.detected_type)}</div>` +
      (flags ? `<div class="r-flags">${flags}</div>` : "") +
      footer,
  );
}

async function scanPage() {
  shotBtn.disabled = true;
  shotBtn.textContent = "Scanning…";
  show('<span class="r-muted">Capturing and checking this page…</span>');
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    const base64 = (dataUrl || "").split(",")[1];
    if (!base64) throw new Error("capture failed");
    const res = await fetch(`${GUARDURAI_API}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-guardurai-client": "extension" },
      credentials: "include",
      body: JSON.stringify({ image: { media_type: "image/png", data: base64 } }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) {
      show(
        `<span class="r-muted">You've used today's free check. ` +
          `<a class="r-link" href="${esc(GUARDURAI_API)}" target="_blank" rel="noreferrer">Upgrade</a> for more.</span>`,
      );
    } else if (!res.ok) {
      show(`<span class="r-muted">${esc(data?.error || "Something went wrong.")}</span>`);
    } else {
      renderVerdict(data);
    }
  } catch {
    show('<span class="r-muted">Couldn\'t capture this page. Some pages (e.g. chrome:// or the Web Store) block screenshots.</span>');
  } finally {
    shotBtn.disabled = false;
    shotBtn.innerHTML = "<span>📸</span> Scan this page";
  }
}

shotBtn.addEventListener("click", scanPage);

// ── Auth status ───────────────────────────────────────────────────────────────

async function checkAuth() {
  try {
    const res = await fetch(`${GUARDURAI_API}/api/me`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = res.ok ? await res.json() : null;
    const openTab = (path) => {
      chrome.tabs.create({ url: `${GUARDURAI_API}${path}` });
      window.close();
    };

    if (data?.signedIn) {
      const name = data.firstName ? esc(data.firstName) : "Signed in";
      const tier = data.tier || "free";
      const TIER_LABEL = { free: "Free plan", pro: "Pro ✓", family: "Family ✓" };
      authText.textContent = `${name} · ${TIER_LABEL[tier] || "Free plan"}`;
      authText.classList.add("ok");

      if (tier === "free") {
        // Signed-in but free — the prime upgrade target. Push Family.
        authBtn.textContent = "Upgrade";
        authBtn.style.display = "";
        authBtn.onclick = () => openTab("/family?ref=ext-popup");
      } else {
        authBtn.style.display = "none";
      }
    } else {
      // Anonymous — capture them. Lead with the benefit, not just "Sign in".
      authText.textContent = "Sign in to sync your protection";
      authText.classList.remove("ok");
      authBtn.textContent = "Sign in";
      authBtn.style.display = "";
      authBtn.onclick = () => openTab("/sign-in?ref=ext-popup");
    }
  } catch {
    authText.textContent = "Couldn't check sign-in status";
  }
}

checkAuth();
