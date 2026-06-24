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
          background: none; border: none; cursor: pointer;
          color: #64748b; font-size: 13px; font-weight: 600; text-decoration: underline;
          padding: 6px;
        }
        #ignore:hover { color: #0f172a; }
        #brand { margin-top: 20px; font-size: 12px; color: #94a3b8; }
      </style>
      <div id="backdrop">
        <div id="card" role="alertdialog" aria-modal="true">
          <button id="close" aria-label="Close and continue anyway">×</button>
          <div id="icon">${icon}</div>
          <div id="title">${headline}</div>
          ${topFlag ? `<div id="sub">${topFlag}</div>` : `<div id="sub">Guardurai detected signs of a scam on this page.</div>`}
          ${upsell}
          <div id="actions">
            <a id="ai" href="https://guardurai.com/?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener noreferrer">Check with AI for details</a>
            <button id="ignore">I understand the risk — continue anyway</button>
          </div>
          <div id="brand">🛡️ Protected by Guardurai</div>
        </div>
      </div>`;

    const close = () => host.remove();
    shadow.getElementById("close").addEventListener("click", close);
    shadow.getElementById("ignore").addEventListener("click", close);
    // Clicking the dimmed backdrop (outside the card) also dismisses.
    shadow.getElementById("backdrop").addEventListener("click", (e) => {
      if (e.target && e.target.id === "backdrop") close();
    });

    document.documentElement.appendChild(host);
  }
  } // end doPassiveCheck
})();
