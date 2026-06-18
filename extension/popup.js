const input = document.getElementById("input");
const button = document.getElementById("check");
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

async function check() {
  const text = input.value.trim();
  if (!text) return;

  button.disabled = true;
  button.textContent = "Checking…";
  show('<span class="muted">Checking this for scams…</span>');

  try {
    const res = await fetch(`${SCAMSHIELD_API}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send ScamShield cookies so signed-in users get their plan.
      credentials: "include",
      body: JSON.stringify({ text }),
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
      const color = COLORS[data.risk_level] || "#64748b";
      const label = LABELS[data.risk_level] || data.risk_level || "Unknown";
      show(
        `<span class="badge" style="background:${color};">${esc(label)}</span>` +
          `<p class="summary">${esc(data.summary)}</p>` +
          `<div class="meta">Confidence ${esc(data.confidence)}% · ${esc(data.detected_type)}</div>` +
          `<div class="meta" style="margin-top:8px;">` +
          `<a href="${esc(SCAMSHIELD_API)}" target="_blank" rel="noreferrer">Open full result →</a></div>`,
      );
    }
  } catch {
    show('<span class="muted">Couldn\'t reach ScamShield. Check your connection.</span>');
  } finally {
    button.disabled = false;
    button.textContent = "Check for scams";
  }
}

button.addEventListener("click", check);
input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") check();
});
