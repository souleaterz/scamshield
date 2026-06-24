// Guardurai Gmail integration
// Runs on mail.google.com — detects open emails, injects a "Check with Guardurai"
// button, extracts body + sender, and shows an inline verdict panel.
//
// Decoy lifecycle: once deployed, a decoy persists in chrome.storage.local so it
// survives the card closing, email navigation, and page reloads. The card's ×
// only *minimises* to a floating pill; the decoy is fully cleared only by the
// explicit "End decoy" action.

(function () {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return;

  let btnHost = null;
  let lastMessageId = null;
  let decoyTicker = null;
  // { persona, reply, sessionId, senderEmail, startTime, reported } | null
  let activeDecoy = null;

  // ── Email extraction ────────────────────────────────────────────────────────

  function extractEmail() {
    const messages = [...document.querySelectorAll("[data-message-id]")];
    if (!messages.length) return null;

    const subject =
      document.querySelector("h2.hP")?.textContent?.trim() ?? "(no subject)";

    const parts = [];
    for (const msg of messages) {
      const senderEl = msg.querySelector("[email]");
      const fromEmail = senderEl?.getAttribute("email") ?? "";
      const fromName =
        senderEl?.getAttribute("name") ??
        senderEl?.textContent?.trim() ??
        "";

      const bodyEl =
        msg.querySelector(".a3s.aiL") ??
        msg.querySelector(".ii.gt") ??
        msg.querySelector("[data-message-id] .gs");
      const body = bodyEl?.innerText?.trim() ?? "";

      if (fromEmail || body) {
        parts.push(
          [fromEmail && `From: ${fromName} <${fromEmail}>`, body]
            .filter(Boolean)
            .join("\n\n"),
        );
      }
    }

    if (!parts.length) return null;
    return `Subject: ${subject}\n\n${parts.join("\n\n---\n\n")}`;
  }

  function extractSenderEmail() {
    const msg = document.querySelector("[data-message-id]");
    return msg?.querySelector("[email]")?.getAttribute("email") ?? null;
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

  const COUNTRIES = [
    { code: "GB", flag: "🇬🇧", label: "UK" },
    { code: "US", flag: "🇺🇸", label: "US" },
    { code: "AU", flag: "🇦🇺", label: "Australia" },
    { code: "CA", flag: "🇨🇦", label: "Canada" },
  ];

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
        max-height: calc(100vh - 120px); overflow-y: auto;
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
      /* Floating "decoy active" pill — reopens the card without re-checking */
      #decoy-pill {
        display: none; align-items: center; gap: 6px;
        background: #7c3aed; color: #fff; border: none;
        border-radius: 24px; padding: 10px 16px; cursor: pointer;
        font: 600 13px -apple-system, "Segoe UI", sans-serif;
        box-shadow: 0 2px 14px rgba(124,58,237,.45); transition: background .15s;
        position: fixed; bottom: 72px; right: 96px; z-index: 99999;
      }
      #decoy-pill:hover { background: #6d28d9; }
      #decoy-pill .pill-time { font-variant-numeric: tabular-nums; letter-spacing: .04em; }
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
      /* Decoy styles */
      .decoy-btn {
        width: 100%; margin-top: 10px; padding: 9px 12px;
        background: #7c3aed; color: #fff; border: none; border-radius: 10px;
        cursor: pointer; font: 600 12px -apple-system, "Segoe UI", sans-serif;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        transition: background .15s;
      }
      .decoy-btn:hover { background: #6d28d9; }
      .decoy-btn:disabled { background: #94a3b8; cursor: wait; }
      .divider { border: none; border-top: 1px solid #f1f5f9; margin: 12px 0; }
      .country-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
      .country-btn {
        padding: 8px 6px; background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 8px; cursor: pointer;
        font: 500 12px -apple-system, "Segoe UI", sans-serif;
        text-align: center; transition: all .15s; color: #334155;
      }
      .country-btn:hover { background: #7c3aed; color: #fff; border-color: #7c3aed; }
      .section-h {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: .06em; color: #94a3b8; margin: 10px 0 5px;
      }
      .field { font-size: 12px; color: #334155; padding: 3px 0; display: flex; justify-content: space-between; gap: 6px; }
      .field-label { color: #94a3b8; flex-shrink: 0; }
      .field-value { font-weight: 600; text-align: right; word-break: break-all; }
      .reply-box {
        margin-top: 6px; width: 100%; min-height: 80px;
        font: 12px/1.5 -apple-system, "Segoe UI", sans-serif;
        border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;
        resize: vertical; color: #334155; background: #f8fafc;
      }
      .action-row { display: flex; gap: 6px; margin-top: 8px; }
      .action-btn {
        flex: 1; padding: 8px 6px; border: none; border-radius: 8px;
        cursor: pointer; font: 600 11px -apple-system, "Segoe UI", sans-serif;
        transition: background .15s;
      }
      .copy-btn { background: #7c3aed; color: #fff; }
      .copy-btn:hover { background: #6d28d9; }
      .compose-btn { background: #f1f5f9; color: #334155; }
      .compose-btn:hover { background: #e2e8f0; }
      .relay-note {
        font-size: 12px; line-height: 1.5; color: #166534;
        background: #f0fdf4; border: 1px solid #bbf7d0;
        border-radius: 8px; padding: 8px 10px; margin-top: 4px;
      }
      .timer {
        margin-top: 10px; padding: 8px; background: #faf5ff;
        border-radius: 8px; text-align: center;
        font-size: 11px; color: #7c3aed;
      }
      .timer-count { font-size: 18px; font-weight: 700; display: block; letter-spacing: .04em; font-variant-numeric: tabular-nums; }
      .timer-sub { margin-top: 4px; font-size: 11px; color: #a78bda; }
      .end-decoy { margin-top: 10px; text-align: center; }
      .end-decoy button {
        background: none; border: none; color: #94a3b8; font-size: 11px;
        cursor: pointer; text-decoration: underline;
        font-family: -apple-system, "Segoe UI", sans-serif;
      }
      .end-decoy button:hover { color: #ef4444; }
      .limit-note { margin-top: 8px; font-size: 11px; color: #64748b; text-align: center; }
      .limit-note a { color: #7c3aed; text-decoration: none; }
    </style>
    <div id="panel"></div>
    <button id="decoy-pill">🪤 Decoy active · <span class="pill-time" id="decoy-pill-time">00:00</span></button>
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
    const pill = shadow.getElementById("decoy-pill");

    btn.addEventListener("click", () => void runCheck(shadow, btn, panel));
    // Reopen an existing decoy — no re-check, no re-deploy, same persona.
    pill.addEventListener("click", () => renderDecoyCard(shadow, panel));

    // Restore the pill (and resume ticking) if a decoy is already active.
    refreshDecoyUi(shadow);
  }

  function removeButton() {
    // Leaving the email view (e.g. back to inbox) tears down the host, but the
    // decoy stays alive in storage so it can resume when an email is reopened.
    stopTicker();
    if (btnHost) {
      btnHost.remove();
      btnHost = null;
    }
    lastMessageId = null;
  }

  // ── Scam check ──────────────────────────────────────────────────────────────

  async function runCheck(shadow, btn, panel) {
    btn.disabled = true;
    btn.textContent = "Scanning…";
    panel.innerHTML = '<p class="muted">Scanning this email for scam signals…</p>';
    panel.style.display = "block";
    refreshDecoyUi(shadow); // hide the pill while the card is open

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
        panel.innerHTML = renderVerdict(resp.data, text, shadow, panel);
      }

      addCloseListener(shadow, panel);
    });
  }

  function renderVerdict(v, emailText, shadow, panel) {
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

    const decoySection = v.risk_level === "likely_scam"
      ? `<hr class="divider">
         <div class="h">🪤 Fight back</div>
         <button class="decoy-btn" id="deploy-decoy-btn">🪤 Deploy Decoy — waste their time</button>`
      : "";

    const html = `
      <div class="row">
        <span class="badge" style="background:${color}">${esc(label)}</span>
        <button class="close" data-close>×</button>
      </div>
      <p class="summary">${esc(v.summary)}</p>
      <div class="meta">Confidence ${esc(v.confidence)}% · ${esc(v.detected_type)}</div>
      ${flags ? `<div class="h">Red flags</div>${flags}` : ""}
      <div class="foot"><a href="${esc(url)}" target="_blank" rel="noreferrer">See full result on Guardurai →</a></div>
      ${decoySection}`;

    // Attach decoy button listener after render
    setTimeout(() => {
      shadow.getElementById("deploy-decoy-btn")?.addEventListener("click", () => {
        showCountryPicker(shadow, panel, emailText);
      });
    }, 0);

    return html;
  }

  // ── Decoy flow ──────────────────────────────────────────────────────────────

  function showCountryPicker(shadow, panel, emailText) {
    const countryBtns = COUNTRIES.map(
      (c) =>
        `<button class="country-btn" data-code="${esc(c.code)}">${c.flag} ${esc(c.label)}</button>`,
    ).join("");

    panel.innerHTML = `
      <div class="row">
        <strong style="font-size:13px;">🪤 Deploy Decoy</strong>
        <button class="close" data-close>×</button>
      </div>
      <p class="muted" style="margin-top:8px;font-size:12px;">Pick the fake persona's country — the scammer will receive details for a real-seeming person from there.</p>
      <div class="country-grid">${countryBtns}</div>`;

    addCloseListener(shadow, panel);

    shadow.querySelectorAll(".country-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const country = btn.getAttribute("data-code");
        deployDecoy(shadow, panel, emailText, country);
      });
    });
  }

  function deployDecoy(shadow, panel, emailText, country) {
    const senderEmail = extractSenderEmail();

    panel.innerHTML = `
      <div class="row">
        <strong style="font-size:13px;">🪤 Generating decoy…</strong>
      </div>
      <p class="muted" style="margin-top:8px;font-size:12px;">Building your fake persona and crafting a reply…</p>`;

    chrome.runtime.sendMessage(
      { type: "deployDecoy", scamEmailContent: emailText, country, scammerEmail: senderEmail },
      (resp) => {
        if (chrome.runtime.lastError || !resp) {
          panel.innerHTML = renderMsg("Couldn't reach Guardurai. Check your connection.");
          addCloseListener(shadow, panel);
          return;
        }
        if (resp.limitReached) {
          panel.innerHTML = `
            <div class="row">
              <strong style="font-size:13px;">🪤 Decoy limit reached</strong>
              <button class="close" data-close>×</button>
            </div>
            <p class="limit-note">You've used today's free decoy.<br>
            <a href="https://guardurai.com/pricing?ref=ext-decoy" target="_blank" rel="noreferrer">Upgrade to Pro for unlimited decoys →</a></p>`;
          addCloseListener(shadow, panel);
          return;
        }
        if (!resp.ok) {
          panel.innerHTML = renderMsg(esc(resp.error ?? "Something went wrong."));
          addCloseListener(shadow, panel);
          return;
        }

        // Finalise any previous decoy before replacing it.
        if (activeDecoy) {
          const secs = elapsedSecs();
          sendDecoyHeartbeat(secs);
          flushLocal(secs);
        }

        activeDecoy = {
          persona: resp.data.persona,
          reply: resp.data.reply ?? null,
          sessionId: resp.data.sessionId ?? null,
          senderEmail,
          startTime: Date.now(),
          reported: 0,
          relayActive: !!resp.data.relayActive,
          serverSeconds: 0,
          messageCount: 0,
        };
        persistActiveDecoy();

        // Count this deploy for the popup stats.
        chrome.storage.local.get({ decoyCount: 0 }, (s) => {
          chrome.storage.local.set({ decoyCount: (s.decoyCount || 0) + 1 });
        });

        renderDecoyCard(shadow, panel);
      },
    );
  }

  // Renders (or re-renders) the deployed-decoy card from activeDecoy. Safe to
  // call any number of times — this is how the pill reopens the card.
  function renderDecoyCard(shadow, panel) {
    if (!activeDecoy) return;
    const { persona, reply, senderEmail, relayActive } = activeDecoy;

    const bankRows = Object.entries(persona.bankDetails ?? {})
      .map(([k, v]) => fieldRow(k, v))
      .join("");

    const composeUrl = senderEmail
      ? `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(senderEmail)}&body=${encodeURIComponent(reply ?? "")}`
      : null;

    // Relay mode: Guardurai sent the opener and handles the thread server-side,
    // so there's nothing for the user to copy/send.
    const replyBlock = relayActive
      ? `<div class="section-h">Conversation</div>
         <div class="relay-note">✅ Guardurai sent the first reply and is keeping the conversation going. The scammer is talking to your decoy — not you.</div>`
      : reply
        ? `<div class="section-h">Reply to send</div>
           <textarea class="reply-box" id="decoy-reply">${esc(reply)}</textarea>
           <div class="action-row">
             <button class="action-btn copy-btn" id="copy-reply-btn">📋 Copy reply</button>
             ${composeUrl ? `<button class="action-btn compose-btn" id="compose-btn">✉️ Open in Gmail</button>` : ""}
           </div>`
        : "";

    panel.innerHTML = `
      <div class="row">
        <strong style="font-size:13px;">🪤 Decoy deployed</strong>
        <button class="close" data-min title="Minimise">×</button>
      </div>
      <p class="muted" style="margin-top:6px;font-size:12px;">
        ${esc(persona.name.full)} from ${esc(persona.address.town)} is keeping them busy.
      </p>

      <div class="timer">
        ${relayActive ? "Scammer time wasted (live)" : "Scammer time wasted"}
        <span class="timer-count" id="decoy-timer">${fmt(relayActive ? (activeDecoy.serverSeconds || 0) : elapsedSecs())}</span>
        ${relayActive ? `<div class="timer-sub" id="decoy-msgcount">${msgCountLabel(activeDecoy.messageCount || 0)}</div>` : ""}
      </div>

      <div class="section-h">Fake identity</div>
      ${fieldRow("Name", persona.name.full)}
      ${fieldRow("Address", persona.address.full)}
      ${fieldRow("Phone", persona.phone)}
      ${fieldRow("Email", persona.email)}
      ${fieldRow("Date of Birth", persona.dob)}
      ${fieldRow(persona.nationalId.label, persona.nationalId.value)}

      <div class="section-h">Bank / Payment</div>
      ${bankRows}
      ${fieldRow(persona.card.type + " Card", persona.card.number)}
      ${fieldRow("Expiry / CVV", `${persona.card.expiry} / ${persona.card.cvv}`)}

      ${replyBlock}

      <div class="end-decoy"><button data-end>End decoy &amp; stop timer</button></div>`;

    panel.style.display = "block";

    // × minimises to the pill (keeps the decoy alive); "End decoy" clears it.
    shadow.querySelector("[data-min]")?.addEventListener("click", () => {
      panel.style.display = "none";
      refreshDecoyUi(shadow);
    });
    shadow.querySelector("[data-end]")?.addEventListener("click", () => endDecoy(shadow));

    shadow.getElementById("copy-reply-btn")?.addEventListener("click", () => {
      const text = shadow.getElementById("decoy-reply")?.value ?? reply ?? "";
      navigator.clipboard.writeText(text).then(() => {
        const btn = shadow.getElementById("copy-reply-btn");
        if (btn) { btn.textContent = "✓ Copied!"; setTimeout(() => { btn.textContent = "📋 Copy reply"; }, 2000); }
      });
    });

    if (composeUrl) {
      shadow.getElementById("compose-btn")?.addEventListener("click", () => {
        window.open(composeUrl, "_blank", "noopener,noreferrer");
      });
    }

    startTicker(shadow);
    refreshDecoyUi(shadow); // card is open → hide the pill
  }

  function fieldRow(label, value) {
    return `<div class="field"><span class="field-label">${esc(label)}</span><span class="field-value">${esc(value)}</span></div>`;
  }

  // ── Decoy timer + persistence ─────────────────────────────────────────────────

  function fmt(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function elapsedSecs() {
    return activeDecoy ? Math.floor((Date.now() - activeDecoy.startTime) / 1000) : 0;
  }

  function persistActiveDecoy() {
    if (activeDecoy) chrome.storage.local.set({ activeDecoy });
    else chrome.storage.local.remove("activeDecoy");
  }

  function displaySecs() {
    if (!activeDecoy) return 0;
    return activeDecoy.relayActive ? (activeDecoy.serverSeconds || 0) : elapsedSecs();
  }

  function msgCountLabel(n) {
    if (n <= 0) return "Waiting for them to reply…";
    return `${n} message${n !== 1 ? "s" : ""} exchanged`;
  }

  function setTimers(shadow, secs) {
    const t1 = shadow.getElementById("decoy-timer");
    if (t1) t1.textContent = fmt(secs);
    const t2 = shadow.getElementById("decoy-pill-time");
    if (t2) t2.textContent = fmt(secs);
  }

  // Shows/hides the pill based on whether a decoy is active and the card is open,
  // and keeps the ticker running while there's a decoy to track.
  function refreshDecoyUi(shadow) {
    const pill = shadow.getElementById("decoy-pill");
    const panel = shadow.getElementById("panel");
    if (!pill) return;

    if (activeDecoy) {
      const cardOpen = panel && panel.style.display === "block";
      pill.style.display = cardOpen ? "none" : "flex";
      const t = shadow.getElementById("decoy-pill-time");
      if (t) t.textContent = fmt(displaySecs());
      startTicker(shadow);
    } else {
      pill.style.display = "none";
      stopTicker();
    }
  }

  function startTicker(shadow) {
    if (decoyTicker || !activeDecoy) return;
    tick(shadow);
    if (activeDecoy.relayActive) {
      pollStatus(shadow); // immediate refresh of real server numbers
    } else {
      const secs = elapsedSecs();
      if (secs > 0) report(secs); // catch up after a reopen/page reload
    }
    decoyTicker = setInterval(() => tick(shadow), 1000);
  }

  function stopTicker() {
    if (decoyTicker) {
      clearInterval(decoyTicker);
      decoyTicker = null;
    }
  }

  function tick(shadow) {
    if (!activeDecoy) { stopTicker(); return; }

    if (activeDecoy.relayActive) {
      // Display is driven by the server's real engagement time; refresh it on a
      // 15s poll rather than counting client wall-clock.
      setTimers(shadow, activeDecoy.serverSeconds || 0);
      const since = activeDecoy._lastPoll ? Date.now() - activeDecoy._lastPoll : Infinity;
      if (since >= 15000) pollStatus(shadow);
      return;
    }

    const secs = elapsedSecs();
    setTimers(shadow, secs);
    if (secs > 0 && secs % 15 === 0) report(secs);
  }

  function pollStatus(shadow) {
    if (!activeDecoy?.sessionId) return;
    const sid = activeDecoy.sessionId;
    activeDecoy._lastPoll = Date.now();
    chrome.runtime.sendMessage({ type: "decoyStatus", sessionId: sid }, (st) => {
      if (chrome.runtime.lastError || !st || !activeDecoy || activeDecoy.sessionId !== sid) return;
      activeDecoy.serverSeconds = st.secondsWasted || 0;
      activeDecoy.messageCount = st.messageCount || 0;
      persistActiveDecoy();
      setTimers(shadow, activeDecoy.serverSeconds);
      const mc = shadow.getElementById("decoy-msgcount");
      if (mc) mc.textContent = msgCountLabel(activeDecoy.messageCount);
    });
  }

  // Reports elapsed time to the server (global counter) and to local storage
  // (popup stats). Both are idempotent: the server SETs the value, and the local
  // total only adds the unreported delta.
  function report(secs) {
    sendDecoyHeartbeat(secs);
    flushLocal(secs);
  }

  function flushLocal(secs) {
    if (!activeDecoy) return;
    const delta = secs - (activeDecoy.reported || 0);
    if (delta <= 0) return;
    activeDecoy.reported = secs;
    persistActiveDecoy();
    chrome.storage.local.get({ decoySecondsWasted: 0 }, (s) => {
      chrome.storage.local.set({ decoySecondsWasted: (s.decoySecondsWasted || 0) + delta });
    });
  }

  function sendDecoyHeartbeat(secondsWasted) {
    if (!activeDecoy?.sessionId) return;
    try {
      chrome.runtime.sendMessage({
        type: "decoyHeartbeat",
        sessionId: activeDecoy.sessionId,
        secondsWasted,
      });
    } catch {
      // Extension context can be torn down mid-send; ignore.
    }
  }

  function endDecoy(shadow) {
    // Manual-mode decoys report their final client-tracked time; relay decoys
    // are timed server-side from real messages, so nothing to flush.
    if (activeDecoy && !activeDecoy.relayActive) {
      const secs = elapsedSecs();
      sendDecoyHeartbeat(secs);
      flushLocal(secs);
    }
    activeDecoy = null;
    persistActiveDecoy();
    stopTicker();
    const panel = shadow.getElementById("panel");
    if (panel) panel.style.display = "none";
    refreshDecoyUi(shadow);
  }

  // ── Shared helpers ───────────────────────────────────────────────────────────

  function renderMsg(msg, isHtml = false) {
    return `<div class="row">
      <span class="muted">${isHtml ? msg : esc(msg)}</span>
      <button class="close" data-close>×</button>
    </div>`;
  }

  // Generic close: just hides the panel. (The decoy card wires its own × and
  // "End decoy" handlers instead.)
  function addCloseListener(shadow, panel) {
    shadow.querySelector("[data-close]")?.addEventListener("click", () => {
      panel.style.display = "none";
      refreshDecoyUi(shadow); // reveal the pill again if a decoy is still active
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
        // A different email is open — collapse the card, but keep any active
        // decoy running and show its pill so it can be reopened.
        lastMessageId = id;
        if (btnHost) {
          const shadow = btnHost.shadowRoot;
          if (shadow) {
            const panel = shadow.getElementById("panel");
            if (panel) panel.style.display = "none";
            const btn = shadow.getElementById("btn");
            if (btn) btn.innerHTML = "🛡️ Check email";
            refreshDecoyUi(shadow);
          }
        }
      }
      ensureButton();
    } else {
      removeButton();
    }
  }

  const observer = new MutationObserver(checkVisibility);

  // Rehydrate any in-flight decoy before wiring up the UI.
  chrome.storage.local.get({ activeDecoy: null }, (s) => {
    activeDecoy = s.activeDecoy || null;
    setTimeout(() => {
      observer.observe(document.body, { childList: true, subtree: true });
      checkVisibility();
    }, 1500);
  });
})();
