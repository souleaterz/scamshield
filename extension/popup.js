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
    return `${SCAMSHIELD_API}/#r=${encodeURIComponent(JSON.stringify(verdict))}`;
  } catch {
    return SCAMSHIELD_API;
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
  show(
    `<span class="badge" style="background:${color};">${esc(label)}</span>` +
      `<p class="r-summary">${esc(data.summary)}</p>` +
      `<div class="r-meta">Confidence ${esc(data.confidence)}% · ${esc(data.detected_type)}</div>` +
      (flags ? `<div class="r-flags">${flags}</div>` : "") +
      `<div class="r-meta" style="margin-top:8px;">` +
      `<a class="r-link" href="${esc(fullResultUrl(data))}" target="_blank" rel="noreferrer">See full result →</a></div>`,
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
    const res = await fetch(`${SCAMSHIELD_API}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ image: { media_type: "image/png", data: base64 } }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) {
      show(
        `<span class="r-muted">You've used today's free check. ` +
          `<a class="r-link" href="${esc(SCAMSHIELD_API)}" target="_blank" rel="noreferrer">Upgrade</a> for more.</span>`,
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
    const res = await fetch(`${SCAMSHIELD_API}/api/me`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = res.ok ? await res.json() : null;
    if (data?.signedIn) {
      authText.textContent = "Signed in ✓";
      authText.classList.add("ok");
      authBtn.style.display = "none";
    } else {
      authText.textContent = "Not signed in";
      authBtn.textContent = "Sign in";
      authBtn.style.display = "";
      authBtn.onclick = () => {
        chrome.tabs.create({ url: `${SCAMSHIELD_API}/sign-in` });
        window.close();
      };
    }
  } catch {
    authText.textContent = "Couldn't check sign-in status";
  }
}

checkAuth();
