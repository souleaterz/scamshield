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
    const title = isScam
      ? "Guardurai: This site has been flagged as a scam"
      : "Guardurai: This site shows suspicious signs";

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

    // Force positioning with !important so the page can't override it.
    const P = { position: "fixed", top: "0", left: "0", right: "0", "z-index": "2147483647" };
    for (const [k, v] of Object.entries(P)) host.style.setProperty(k, v, "important");

    const shadow = host.attachShadow({ mode: "closed" });

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        #banner {
          display: flex; align-items: center; gap: 10px;
          background: ${bg}; color: #fff;
          border-bottom: 2px solid ${border};
          padding: 10px 16px;
          font: 600 13px/1.4 system-ui, -apple-system, sans-serif;
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 2147483647;
          box-shadow: 0 2px 12px rgba(0,0,0,0.35);
        }
        #icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
        #msg  { flex: 1; min-width: 0; }
        #sub  { font-weight: 400; opacity: .88; font-size: 12px; margin-top: 2px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #upsell { display: inline-block; margin-top: 5px; color: #fff; font-weight: 600;
                  font-size: 12px; text-decoration: underline; text-underline-offset: 2px;
                  cursor: pointer; }
        #upsell:hover { opacity: .85; }
        #btns { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
        #ai {
          background: #fff; color: ${bg}; border: none; cursor: pointer;
          border-radius: 6px; padding: 5px 12px; font: 700 12px system-ui, sans-serif;
          text-decoration: none; display: inline-block; white-space: nowrap;
        }
        #dismiss {
          background: transparent; border: 1.5px solid rgba(255,255,255,.7);
          color: #fff; cursor: pointer; border-radius: 6px;
          padding: 5px 10px; font: 600 12px system-ui, sans-serif;
        }
        #dismiss:hover { background: rgba(255,255,255,.15); }
      </style>
      <div id="banner">
        <span id="icon">${icon}</span>
        <div id="msg">
          <div>${title}</div>
          ${topFlag ? `<div id="sub">${topFlag}</div>` : ""}
          ${upsell}
        </div>
        <div id="btns">
          <a id="ai" href="https://guardurai.com/?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener noreferrer">Check with AI</a>
          <button id="dismiss">Dismiss</button>
        </div>
      </div>`;

    shadow.getElementById("dismiss").addEventListener("click", () => host.remove());

    document.documentElement.insertBefore(host, document.documentElement.firstChild);
  }
  } // end doPassiveCheck
})();
