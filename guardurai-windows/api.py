"""
Thin client over the Guardurai backend.
"""
import re
import requests

BASE_URL = "https://guardurai.com"
TIMEOUT = 30

# Patterns worth sending to the API
_URL_RE = re.compile(r'https?://[^\s]{6,}|www\.[^\s]{6,}', re.IGNORECASE)
_PHONE_RE = re.compile(r'(?:\+44|0)\s?[0-9][0-9\s\-\.]{8,}')
_DOMAIN_RE = re.compile(r'\b[a-zA-Z0-9\-]{3,}\.[a-z]{2,6}\b')


def looks_checkable(text: str) -> bool:
    """Return True if the clipboard text is worth sending to the API."""
    t = text.strip()
    if len(t) < 10 or len(t) > 3000:
        return False
    return bool(_URL_RE.search(t) or _PHONE_RE.search(t))


def check(text: str) -> dict | None:
    """
    POST to /api/analyze and return the parsed verdict dict, or None on error.
    Keys: risk_level, summary, red_flags, advice, detected_type, confidence
    """
    try:
        r = requests.post(
            f"{BASE_URL}/api/analyze",
            json={"text": text.strip()},
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429:
            return {"_rate_limited": True}
    except Exception:
        pass
    return None
