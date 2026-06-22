"""
Thin client over the Guardurai backend.

Two endpoints, two purposes:
  - /api/passive-check  -> free, fast reputation check (DB + Safe Browsing).
                           Used for real-time browser/clipboard monitoring.
                           Stays silent on safe content, never rate-limited.
  - /api/analyze        -> deep AI analysis. Used by the manual Check tab.
                           Counts against the daily quota for free users.

When the app is paired to an account we send the device token so checks run
at the user's paid tier (unlimited analyse, etc).
"""
import re
import requests
import db

BASE_URL = "https://guardurai.com"
TIMEOUT = 30

# Patterns worth sending to the API from the clipboard.
_URL_RE = re.compile(r'https?://[^\s]{6,}|www\.[^\s]{6,}', re.IGNORECASE)
_PHONE_RE = re.compile(r'(?:\+44|0)\s?[0-9][0-9\s\-\.]{8,}')


def _headers() -> dict:
    token = db.get_setting("account_token", "")
    return {"x-guardurai-device": token} if token else {}


def looks_checkable(text: str) -> bool:
    """True if clipboard text is worth a real-time reputation check."""
    t = text.strip()
    if len(t) < 8 or len(t) > 3000:
        return False
    return bool(_URL_RE.search(t) or _PHONE_RE.search(t))


def _first_url(text: str) -> str | None:
    m = _URL_RE.search(text)
    if not m:
        return None
    url = m.group(0)
    return url if url.startswith("http") else f"https://{url}"


def passive_check(text: str) -> dict | None:
    """
    Free real-time reputation check. Extracts the first URL and looks it up.
    Returns a normalised verdict dict, or None if there's nothing to check /
    on error. risk_level is one of: safe | suspicious | likely_scam.
    """
    url = _first_url(text)
    if not url:
        return None
    try:
        r = requests.post(
            f"{BASE_URL}/api/passive-check",
            json={"url": url},
            headers=_headers(),
            timeout=TIMEOUT,
        )
        if r.status_code != 200:
            return None
        data = r.json()
        risk = data.get("riskLevel", "safe")
        flags = data.get("flags", []) or []
        summary = {
            "likely_scam": "This site is on a known scam or malware list.",
            "suspicious": "This site shows warning signs — be careful.",
            "safe": "No known threats for this site.",
        }.get(risk, "Checked.")
        return {
            "risk_level": risk,
            "summary": summary,
            "red_flags": flags,
            "advice": [],
            "detected_type": "Website",
        }
    except Exception:
        return None


def analyze(text: str) -> dict | None:
    """
    Deep AI analysis via /api/analyze. Returns the verdict dict, a
    {"_rate_limited": True} marker on 429, or None on error.
    Verdict keys: risk_level, summary, red_flags, advice, explanation,
                  detected_type, confidence.
    """
    try:
        r = requests.post(
            f"{BASE_URL}/api/analyze",
            json={"text": text.strip()},
            headers=_headers(),
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429:
            return {"_rate_limited": True}
    except Exception:
        pass
    return None
