"use strict";

// Passive page protection. Runs at document_idle on every http/https page.
// Sends the current URL to the background worker (which calls /api/passive-check)
// and injects a warning banner into the page if the result is suspicious or worse.

(function () {
  if (!location.href.startsWith("http")) return;

  // Let our own site detect that the extension is installed (so it can hide the
  // "install the extension" CTA). Gated to first-party only — we don't expose
  // the extension's presence to every site the user visits.
  (function markFirstParty() {
    const h = location.hostname;
    if (h === "guardurai.com" || h.endsWith(".guardurai.com") || h === "localhost") {
      try {
        document.documentElement.setAttribute("data-guardurai-extension", "1.7.0");
      } catch (e) {
        /* ignore */
      }
    }
  })();

  // Tally pages monitored, so the popup can show the value Guardurai delivers.
  try {
    chrome.storage.local.get({ statProtected: 0 }, (s) => {
      chrome.storage.local.set({ statProtected: (s.statProtected || 0) + 1 });
    });
  } catch (e) {
    /* ignore */
  }

  // Major brands that are extremely unlikely to be scam pages.
  // Keeps unnecessary API calls to zero for normal everyday browsing.
  const SAFE = new Set([
    "google.com", "google.co.uk", "google.com.au", "google.ca",
    "youtube.com", "gmail.com", "googlemail.com", "accounts.google.com",
    "facebook.com", "instagram.com", "whatsapp.com", "messenger.com",
    "twitter.com", "x.com", "linkedin.com", "reddit.com", "tiktok.com",
    "amazon.com", "amazon.co.uk", "amazon.ca", "amazon.com.au",
    "ebay.com", "ebay.co.uk", "apple.com", "icloud.com",
    "microsoft.com", "outlook.com", "hotmail.com", "live.com",
    "office.com", "office365.com", "sharepoint.com", "onedrive.com",
    "github.com", "stackoverflow.com", "wikipedia.org", "mozilla.org",
    "bbc.co.uk", "bbc.com", "gov.uk", "hmrc.gov.uk", "nhs.uk",
    "royalmail.com", "paypal.com", "stripe.com", "shopify.com",
    "netflix.com", "spotify.com", "twitch.tv", "discord.com",
    "cloudflare.com", "vercel.app", "netlify.app", "heroku.com",
  ]);

  function isKnownSafe(hostname) {
    const h = hostname.replace(/^www\./, "").toLowerCase();
    if (SAFE.has(h)) return true;
    // Also match subdomains: mail.google.com → google.com
    const parts = h.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      if (SAFE.has(parts.slice(i).join("."))) return true;
    }
    // Always trust *.gov.uk and *.nhs.uk
    if (h.endsWith(".gov.uk") || h.endsWith(".nhs.uk")) return true;
    return false;
  }

  if (isKnownSafe(location.hostname)) return;

  // Respect the passive protection toggle from the popup.
  chrome.storage.local.get({ passiveEnabled: true }, ({ passiveEnabled }) => {
    if (!passiveEnabled) return;
    doPassiveCheck();
  });

  function doPassiveCheck() {
  // Ask the background service worker to do the check (avoids CORS).
  chrome.runtime.sendMessage(
    { type: "passiveCheck", url: location.href },
    function (result) {
      if (chrome.runtime.lastError) return; // extension context gone
      if (!result || result.riskLevel === "safe") return;
      showBanner(result);
    },
  );

  function showBanner(result) {
    if (document.getElementById("ss-passive-host")) return;

    // Count threats caught (suspicious or scam) for the popup's value stat.
    try {
      chrome.storage.local.get({ statBlocked: 0 }, (s) => {
        chrome.storage.local.set({ statBlocked: (s.statBlocked || 0) + 1 });
      });
    } catch (e) {
      /* ignore */
    }

    const isScam = result.riskLevel === "likely_scam";
    const bg = isScam ? "#dc2626" : "#d97706";
    const border = isScam ? "#991b1b" : "#92400e";
    const icon = isScam ? "🚨" : "⚠️";

    const topFlag = result.flags?.[0] ?? "";

    // Moment-of-fear upsell: only free/anonymous users, only on real scams.
    // The strongest pitch here is Family — "a loved one could land on this too,
    // and you'd be alerted." Paying users never see it.
    const isPaid = result.tier === "pro" || result.tier === "family";
    const showUpsell = isScam && !isPaid;
    const upsell = showUpsell
      ? `<a id="upsell" href="https://guardurai.com/family?ref=ext-scam" target="_blank" rel="noopener noreferrer">🛡️ A family member could land on a site like this — get alerted the moment they do →</a>`
      : "";

    const host = document.createElement("div");
    host.id = "ss-passive-host";

    // Full-screen host with !important so the page can't override or hide it.
    const P = { position: "fixed", inset: "0", "z-index": "2147483647" };
    for (const [k, v] of Object.entries(P)) host.style.setProperty(k, v, "important");

    const shadow = host.attachShadow({ mode: "closed" });

    const headline = isScam
      ? "Warning: this site has been flagged as a scam"
      : "Caution: this site shows suspicious signs";

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
        #backdrop {
          position: fixed; inset: 0; z-index: 2147483647;
          background: rgba(15, 23, 42, .72);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fade .18s ease;
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        #card {
          position: relative;
          width: min(560px, 94vw); min-height: 50vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          background: #fff; border-radius: 20px;
          border-top: 8px solid ${bg};
          box-shadow: 0 24px 60px rgba(0,0,0,.45);
          padding: 40px 36px;
          animation: pop .22s ease;
        }
        #close {
          position: absolute; top: 14px; right: 16px;
          width: 34px; height: 34px; border-radius: 50%;
          border: none; background: #f1f5f9; color: #475569;
          font-size: 22px; line-height: 1; cursor: pointer;
        }
        #close:hover { background: #e2e8f0; color: #0f172a; }
        #icon { font-size: 64px; line-height: 1; }
        #title { margin-top: 16px; font-size: 24px; font-weight: 800;
                 color: ${border}; line-height: 1.25; }
        #sub { margin-top: 12px; font-size: 15px; color: #334155; line-height: 1.5;
               max-width: 42ch; }
        #upsell { display: inline-block; margin-top: 18px; padding: 12px 16px;
                  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;
                  color: #1d4ed8; font-weight: 600; font-size: 14px;
                  text-decoration: none; line-height: 1.4; max-width: 44ch; }
        #upsell:hover { background: #dbeafe; }
        #actions { margin-top: 24px; display: flex; flex-direction: column; gap: 10px;
                   width: 100%; max-width: 320px; }
        #ai {
          display: block; background: ${bg}; color: #fff; border: none; cursor: pointer;
          border-radius: 12px; padding: 13px 18px; font-size: 15px; font-weight: 700;
          text-decoration: none;
        }
        #ai:hover { filter: brightness(.94); }
        #ignore {
          background: none; border: 1px solid #cbd5e1; cursor: pointer;
          color: #64748b; font-size: 14px; font-weight: 600; border-radius: 12px;
          padding: 11px 18px;
        }
        #ignore:not(:disabled):hover { color: #0f172a; border-color: #94a3b8; }
        #ignore:disabled { opacity: .4; cursor: not-allowed; }
        #ack-row {
          margin-top: 22px; display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 12px;
          background: #f8fafc; border: 1.5px solid #e2e8f0; cursor: pointer;
          max-width: 360px; width: 100%;
        }
        #ack-row.nudge { border-color: ${bg}; background: #fef2f2; animation: nudge .4s; }
        @keyframes nudge {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-6px); }
          40%,80% { transform: translateX(6px); }
        }
        #ack { width: 19px; height: 19px; flex-shrink: 0; cursor: pointer; accent-color: ${bg}; }
        #ack-label { font-size: 14px; font-weight: 600; color: #0f172a; cursor: pointer; text-align: left; }
        #brand { margin-top: 18px; font-size: 12px; color: #94a3b8; }
      </style>
      <div id="backdrop">
        <div id="card" role="alertdialog" aria-modal="true">
          <button id="close" aria-label="Close warning">×</button>
          <div id="icon">${icon}</div>
          <div id="title">${headline}</div>
          ${topFlag ? `<div id="sub">${topFlag}</div>` : `<div id="sub">Guardurai detected signs of a scam on this page.</div>`}
          ${upsell}
          <label id="ack-row" for="ack">
            <input type="checkbox" id="ack" />
            <span id="ack-label">I understand the risks</span>
          </label>
          <div id="actions">
            <a id="ai" href="https://guardurai.com/?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener noreferrer">Check with AI for details</a>
            <button id="ignore" disabled>Continue anyway</button>
          </div>
          <div id="brand">🛡️ Protected by Guardurai</div>
        </div>
      </div>`;

    const ackBox = shadow.getElementById("ack");
    const ackRow = shadow.getElementById("ack-row");
    const ignoreBtn = shadow.getElementById("ignore");

    ackBox.addEventListener("change", () => {
      ignoreBtn.disabled = !ackBox.checked;
    });

    // Collapse the big modal into a small, persistent top banner so the page
    // stays usable but the scam warning never fully disappears.
    const collapse = () => {
      host.remove();
      showMiniBanner(result);
    };

    // The user must tick "I understand the risks" before any close path works.
    const attemptClose = () => {
      if (!ackBox.checked) {
        ackRow.classList.remove("nudge");
        void ackRow.offsetWidth; // reflow so the animation restarts each try
        ackRow.classList.add("nudge");
        return;
      }
      collapse();
    };

    shadow.getElementById("close").addEventListener("click", attemptClose);
    ignoreBtn.addEventListener("click", attemptClose);
    shadow.getElementById("backdrop").addEventListener("click", (e) => {
      if (e.target && e.target.id === "backdrop") attemptClose();
    });

    document.documentElement.appendChild(host);
  }

  // Small persistent warning bar shown after the user acknowledges the big
  // modal — keeps the scam warning visible without blocking the page.
  function showMiniBanner(result) {
    if (document.getElementById("ss-passive-mini")) return;
    const isScam = result.riskLevel === "likely_scam";
    const bg = isScam ? "#dc2626" : "#d97706";
    const icon = isScam ? "🚨" : "⚠️";
    const text = isScam
      ? "Guardurai: this site has been flagged as a scam"
      : "Guardurai: this site shows suspicious signs";

    const host = document.createElement("div");
    host.id = "ss-passive-mini";
    const P = { position: "fixed", top: "0", left: "0", right: "0", "z-index": "2147483647" };
    for (const [k, v] of Object.entries(P)) host.style.setProperty(k, v, "important");

    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
        #bar { display: flex; align-items: center; gap: 10px;
               background: ${bg}; color: #fff; padding: 9px 14px;
               font: 600 13px/1.4 system-ui, sans-serif;
               box-shadow: 0 2px 10px rgba(0,0,0,.3); }
        #i { font-size: 16px; flex-shrink: 0; }
        #t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #d { color: #fff; font-size: 12px; white-space: nowrap; text-decoration: underline; text-underline-offset: 2px; }
        #x { background: transparent; border: 1.5px solid rgba(255,255,255,.6); color: #fff;
             cursor: pointer; border-radius: 6px; padding: 3px 10px; font: 600 12px system-ui; flex-shrink: 0; }
        #x:hover { background: rgba(255,255,255,.15); }
      </style>
      <div id="bar">
        <span id="i">${icon}</span>
        <span id="t">${text}</span>
        <a id="d" href="https://guardurai.com/?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener noreferrer">Details</a>
        <button id="x" aria-label="Dismiss">Dismiss</button>
      </div>`;

    shadow.getElementById("x").addEventListener("click", () => host.remove());
    document.documentElement.insertBefore(host, document.documentElement.firstChild);
  }
  } // end doPassiveCheck
})();
