const input = document.getElementById("input");
const button = document.getElementById("check");
const shotButton = document.getElementById("shot");
const result = document.getElementById("result");

const COLORS = { safe: "#10b981", suspicious: "#f59e0b", likely_scam: "#ef4444" };
const LABELS = { safe: "Safe", suspicious: "Suspicious", likely_scam: "Likely Scam" };

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function show(html) {
  result.innerHTML = html;
  result.style.display = "block";
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
        .map((f) => `<div class="li"><span class="dot">•</span>${esc(f)}</div>`)
        .join("")
    : "";
  show(
    `<span class="badge" style="background:${color};">${esc(label)}</span>` +
      `<p class="summary">${esc(data.summary)}</p>` +
      `<div class="meta">Confidence ${esc(data.confidence)}% · ${esc(data.detected_type)}</div>` +
      (flags ? `<div class="flags">${flags}</div>` : "") +
      `<div class="meta" style="margin-top:8px;">` +
      `<a href="${esc(fullResultUrl(data))}" target="_blank" rel="noreferrer">See full result →</a></div>`,
  );
}

async function analyze(body, loadingText) {
  show(`<span class="muted">${esc(loadingText)}</span>`);
  const res = await fetch(`${SCAMSHIELD_API}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // use the signed-in user's plan if available
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    show(
      `<span class="muted">You've used today's free check. ` +
        `<a href="${esc(SCAMSHIELD_API)}" target="_blank" rel="noreferrer">Upgrade</a> for more.</span>`,
    );
  } else if (!res.ok) {
    show(`<span class="muted">${esc(data?.error || "Something went wrong.")}</span>`);
  } else {
    renderVerdict(data);
  }
}

async function checkText() {
  const text = input.value.trim();
  if (!text) return;
  setBusy(true);
  try {
    await analyze({ text }, "Checking this for scams…");
  } catch {
    show('<span class="muted">Couldn\'t reach ScamShield. Check your connection.</span>');
  } finally {
    setBusy(false);
  }
}

async function scanPage() {
  setBusy(true);
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    const base64 = (dataUrl || "").split(",")[1];
    if (!base64) throw new Error("capture failed");
    await analyze(
      { image: { media_type: "image/png", data: base64 } },
      "Capturing and checking this page…",
    );
  } catch {
    show('<span class="muted">Couldn\'t capture this page. Some pages (e.g. chrome:// or the Web Store) block it.</span>');
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  button.disabled = busy;
  shotButton.disabled = busy;
  button.textContent = busy ? "Checking…" : "Check for scams";
}

button.addEventListener("click", checkText);
shotButton.addEventListener("click", scanPage);
input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") checkText();
});
