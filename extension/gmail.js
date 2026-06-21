// Guardurai Gmail integration
// Runs on mail.google.com — detects open emails, injects a "Check with Guardurai"
// button, extracts body + sender, and shows an inline verdict panel.

(function () {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return;

  let btnHost = null;
  let lastMessageId = null;

  // ── Email extraction ────────────────────────────────────────────────────────

  function extractEmail() {
    const messages = [...document.querySelectorAll("[data-message-id]")];
    if (!messages.length) return null;

    const subject =
      document.querySelector("h2.hP")?.textContent?.trim() ?? "(no subject)";

    const parts = [];
    for (const msg of messages) {
      // Sender — [email] attribute is the most stable Gmail selector
      const senderEl = msg.querySelector("[email]");
      const fromEmail = senderEl?.getAttribute("email") ?? "";
      const fromName =
        senderEl?.getAttribute("name") ??
        senderEl?.textContent?.trim() ??
        "";

      // Body — try known stable selectors in order of reliability
      const bodyEl =
        msg.querySelector(".a3s.aiL") ??
        msg.querySelector(".ii.gt") ??
        msg.querySelector("[data-message-id] .gs");
      const body = bodyEl?.innerText?.trim() ?? "";

      if (fromEmail || body) {
        parts.push(
          [
            fromEmail && `From: ${fromName} <${fromEmail}>`,
            body,
          ]
            .filter(Boolean)
            .join("\n\n"),
        );
      }
    }

    if (!parts.length) return null;

    return `Subject: ${subject}\n\n${parts.join("\n\n---\n\n")}`;
  }

  // ── Shadow DOM button + panel ───────────────────────────────────────────────

  const COLORS = {
    safe: "#10b981",
    suspicious: "#f59e0b",
    likely_scam: "#ef4444",
  };
  const LABELS = {
    safe: "Safe",
    suspicious: "Suspicious",
    likely_scam: "Likely Scam",
  };

  function esc(s) {
    return String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  }

  function buildShadowHtml() {
    return `<style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      #panel {
        position: fixed; bottom: 72px; right: 96px; width: 340px;
        background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,.18); padding: 16px;
        display: none; font: 14px/1.45 -apple-system, "Segoe UI", sans-serif;
        color: #0f172a; z-index: 99998;
      }
      #btn {
        display: flex; align-items: center; gap: 7px;
        background: #1e40af; color: #fff; border: none;
        border-radius: 24px; padding: 10px 18px; cursor: pointer;
        font: 600 13px -apple-system, "Segoe UI", sans-serif;
        box-shadow: 0 2px 14px rgba(30,64,175,.4); transition: background .15s;
        position: fixed; bottom: 24px; right: 96px; z-index: 99999;
      }
      #btn:hover:not(:disabled) { background: #1d4ed8; }
      #btn:disabled { background: #94a3b8; cursor: wait; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; color: #fff; }
      .close { cursor: pointer; border: none; background: none; color: #94a3b8; font-size: 20px; line-height: 1; flex-shrink: 0; }
      .close:hover { color: #475569; }
      .summary { margin: 10px 0 0; font-size: 13px; line-height: 1.45; }
      .meta { margin-top: 5px; font-size: 11px; color: #64748b; }
      .h { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 12px 0 4px; }
      .flag { display: flex; gap: 5px; font-size: 12px; color: #334155; margin: 2px 0; }
      .dot { color: #ef4444; flex-shrink: 0; margin-top: 1px; }
      .foot { margin-top: 12px; font-size: 11px; }
      .foot a { color: #2563eb; text-decoration: none; }
      .muted { color: #64748b; font-size: 13px; }
    </style>
    <div id="panel"></div>
    <button id="btn">🛡️ Check email</button>`;
  }

  function ensureButton() {
    if (btnHost) return;

    btnHost = document.createElement("div");
    btnHost.id = "ss-gmail-host";
    document.body.appendChild(btnHost);

    const shadow = btnHost.attachShadow({ mode: "open" });
    shadow.innerHTML = buildShadowHtml();

    const btn = shadow.getElementById("btn");
    const panel = shadow.getElementById("panel");

    btn.addEventListener("click", () => void runCheck(shadow, btn, panel));
  }

  function removeButton() {
    if (btnHost) {
      btnHost.remove();
      btnHost = null;
    }
    lastMessageId = null;
  }

  // ── Check ───────────────────────────────────────────────────────────────────

  async function runCheck(shadow, btn, panel) {
    btn.disabled = true;
    btn.textContent = "Scanning…";
    panel.innerHTML = '<p class="muted">Scanning this email for scam signals…</p>';
    panel.style.display = "block";

    const text = extractEmail();
    if (!text) {
      panel.innerHTML = renderMsg(
        "Couldn't read this email — try scrolling to fully expand it first.",
      );
      addCloseListener(shadow, panel);
      btn.disabled = false;
      btn.innerHTML = "🛡️ Check email";
      return;
    }

    chrome.runtime.sendMessage({ type: "analyzeText", text }, (resp) => {
      btn.disabled = false;
      btn.innerHTML = "🛡️ Check email";

      if (chrome.runtime.lastError || !resp) {
        panel.innerHTML = renderMsg("Couldn't reach Guardurai. Check your connection.");
      } else if (resp.limitReached) {
        panel.innerHTML = renderMsg(
          'You\'ve used today\'s free check. <a href="https://guardurai.com" target="_blank" rel="noreferrer">Upgrade →</a>',
          true,
        );
      } else if (!resp.ok) {
        panel.innerHTML = renderMsg(esc(resp.error ?? "Something went wrong."));
      } else {
        panel.innerHTML = renderVerdict(resp.data);
      }

      addCloseListener(shadow, panel);
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

  function addCloseListener(shadow, panel) {
    shadow.querySelector("[data-close]")?.addEventListener("click", () => {
      panel.style.display = "none";
    });
  }

  // ── Navigation detection (Gmail SPA) ───────────────────────────────────────

  function currentMessageId() {
    const msgs = document.querySelectorAll("[data-message-id]");
    return msgs.length ? msgs[msgs.length - 1].getAttribute("data-message-id") : null;
  }

  function checkVisibility() {
    const id = currentMessageId();
    if (id) {
      if (id !== lastMessageId) {
        // New email opened — reset any previous panel state
        lastMessageId = id;
        if (btnHost) {
          const shadow = btnHost.shadowRoot;
          if (shadow) {
            const panel = shadow.getElementById("panel");
            if (panel) panel.style.display = "none";
            const btn = shadow.getElementById("btn");
            if (btn) btn.innerHTML = "🛡️ Check email";
          }
        }
      }
      ensureButton();
    } else {
      removeButton();
    }
  }

  // Use MutationObserver to catch Gmail's SPA navigation
  const observer = new MutationObserver(checkVisibility);

  // Wait for Gmail to finish initial render before observing
  setTimeout(() => {
    observer.observe(document.body, { childList: true, subtree: true });
    checkVisibility();
  }, 1500);
})();
