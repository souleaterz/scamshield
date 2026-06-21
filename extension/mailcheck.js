// Guardurai generic webmail integration
// Runs on webmail providers that don't have a dedicated integration (Outlook,
// Yahoo, iCloud, Proton, AOL). Gmail has its own richer integration in gmail.js.
//
// Approach: instead of scraping each provider's ever-changing DOM, we watch the
// user's text selection. When they highlight a chunk of an email, a floating
// "Check with Guardurai" button appears; clicking it runs the same scam check.

(function () {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return;

  const MIN_CHARS = 40;
  let host = null;
  let shadow = null;
  let selectedText = "";

  const COLORS = { safe: "#10b981", suspicious: "#f59e0b", likely_scam: "#ef4444" };
  const LABELS = { safe: "Safe", suspicious: "Suspicious", likely_scam: "Likely Scam" };

  function esc(s) {
    return String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  }

  function ensureHost() {
    if (host) return;
    host = document.createElement("div");
    host.id = "__guardurai_mailcheck_host__";
    document.documentElement.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      #btn {
        position: fixed; z-index: 2147483646; display: none;
        align-items: center; gap: 7px;
        background: #1e40af; color: #fff; border: none; border-radius: 24px;
        padding: 9px 16px; cursor: pointer;
        font: 600 13px -apple-system, "Segoe UI", sans-serif;
        box-shadow: 0 2px 14px rgba(30,64,175,.45); transition: background .15s;
      }
      #btn:hover:not(:disabled) { background: #1d4ed8; }
      #btn:disabled { background: #94a3b8; cursor: wait; }
      #panel {
        position: fixed; bottom: 24px; right: 24px; width: 340px; display: none;
        background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,.18); padding: 16px; z-index: 2147483647;
        font: 14px/1.45 -apple-system, "Segoe UI", sans-serif; color: #0f172a;
      }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; color: #fff; }
      .close { cursor: pointer; border: none; background: none; color: #94a3b8; font-size: 20px; line-height: 1; flex-shrink: 0; }
      .close:hover { color: #475569; }
      .summary { margin: 10px 0 0; font-size: 13px; }
      .meta { margin-top: 5px; font-size: 11px; color: #64748b; }
      .h { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 12px 0 4px; }
      .flag { display: flex; gap: 5px; font-size: 12px; color: #334155; margin: 2px 0; }
      .dot { color: #ef4444; flex-shrink: 0; margin-top: 1px; }
      .foot { margin-top: 12px; font-size: 11px; }
      .foot a { color: #2563eb; text-decoration: none; }
      .muted { color: #64748b; font-size: 13px; }
    </style>
    <button id="btn">🛡️ Check with Guardurai</button>
    <div id="panel"></div>`;

    shadow.getElementById("btn").addEventListener("click", runCheck);
  }

  function btn() {
    return shadow?.getElementById("btn");
  }
  function panel() {
    return shadow?.getElementById("panel");
  }

  function hideButton() {
    const b = btn();
    if (b) b.style.display = "none";
  }

  function showButtonAt(rect) {
    ensureHost();
    const b = btn();
    if (!b) return;
    // Position just above the selection, clamped to the viewport.
    const top = Math.max(8, rect.top - 44);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - 220,
    );
    b.style.top = `${top}px`;
    b.style.left = `${left}px`;
    b.style.display = "inline-flex";
  }

  function onSelectionChange() {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";

    // Ignore selections inside our own UI.
    if (host && sel?.anchorNode && host.contains(sel.anchorNode)) return;

    if (!sel || sel.isCollapsed || text.length < MIN_CHARS) {
      hideButton();
      selectedText = "";
      return;
    }

    selectedText = text;
    try {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect && (rect.width || rect.height)) showButtonAt(rect);
    } catch {
      /* selection without a usable range — ignore */
    }
  }

  function addCloseListener() {
    shadow
      ?.querySelector("[data-close]")
      ?.addEventListener("click", () => {
        const p = panel();
        if (p) p.style.display = "none";
      });
  }

  function renderVerdict(v) {
    const color = COLORS[v.risk_level] ?? "#64748b";
    const label = LABELS[v.risk_level] ?? v.risk_level ?? "Unknown";
    const flags = (v.red_flags ?? [])
      .slice(0, 4)
      .map(
        (f) =>
          `<div class="flag"><span class="dot">•</span><span>${esc(f)}</span></div>`,
      )
      .join("");
    const url = `https://guardurai.com/#r=${encodeURIComponent(JSON.stringify(v))}`;
    return `
      <div class="row">
        <span class="badge" style="background:${color}">${esc(label)}</span>
        <button class="close" data-close>×</button>
      </div>
      <p class="summary">${esc(v.summary)}</p>
      <div class="meta">Confidence ${esc(v.confidence)}% · ${esc(v.detected_type)}</div>
      ${flags ? `<div class="h">Red flags</div>${flags}` : ""}
      <div class="foot"><a href="${esc(url)}" target="_blank" rel="noreferrer">See full result on Guardurai →</a></div>`;
  }

  function renderMsg(msg, isHtml = false) {
    return `<div class="row">
      <span class="muted">${isHtml ? msg : esc(msg)}</span>
      <button class="close" data-close>×</button>
    </div>`;
  }

  function runCheck() {
    const text = selectedText;
    if (!text) return;

    const b = btn();
    const p = panel();
    if (!b || !p) return;

    b.disabled = true;
    b.textContent = "Scanning…";
    p.innerHTML = '<p class="muted">Scanning this text for scam signals…</p>';
    p.style.display = "block";

    chrome.runtime.sendMessage({ type: "analyzeText", text }, (resp) => {
      b.disabled = false;
      b.innerHTML = "🛡️ Check with Guardurai";
      hideButton();

      if (chrome.runtime.lastError || !resp) {
        p.innerHTML = renderMsg("Couldn't reach Guardurai. Check your connection.");
      } else if (resp.limitReached) {
        p.innerHTML = renderMsg(
          'You\'ve used today\'s free check. <a href="https://guardurai.com" target="_blank" rel="noreferrer">Upgrade →</a>',
          true,
        );
      } else if (!resp.ok) {
        p.innerHTML = renderMsg(esc(resp.error ?? "Something went wrong."));
      } else {
        p.innerHTML = renderVerdict(resp.data);
      }
      addCloseListener();
    });
  }

  document.addEventListener("selectionchange", () => {
    // Debounce: selectionchange fires rapidly while dragging.
    clearTimeout(onSelectionChange._t);
    onSelectionChange._t = setTimeout(onSelectionChange, 200);
  });

  // Hide the floating button on scroll (its anchored position goes stale).
  window.addEventListener("scroll", hideButton, { passive: true, capture: true });
})();
