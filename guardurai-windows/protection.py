"""
Protection engine — coordinates clipboard + URL monitoring.

Real-time monitoring (browser address bar + clipboard) uses the FREE
passive-check reputation endpoint, so it never burns the user's daily AI
quota and stays silent unless something is actually flagged.

The manual Check tab uses the deep AI analyse endpoint (check_manual).
"""
import threading
import time
import pyperclip
import api
import db
from url_monitor import UrlMonitor

CLIP_INTERVAL = 1.5


class ProtectionEngine:
    def __init__(self):
        self.active = True
        self._on_result = None
        self._last_clip = ""

    # ── Public ───────────────────────────────────────────────────────────────

    def start(self, on_result):
        self._on_result = on_result
        # Restore persisted on/off state.
        self.active = db.get_setting("protection_active", "true") != "false"
        threading.Thread(target=self._clipboard_loop, daemon=True).start()
        UrlMonitor(on_url=self._handle_url).start()

    def check_manual(self, text: str) -> dict | None:
        """Deep AI analysis from the Check tab. Always recorded to history."""
        result = api.analyze(text)
        if result and not result.get("_rate_limited"):
            db.add_scan()
            db.add_history(text, result, source="manual")
        return result

    # ── Internal (real-time, reputation only) ────────────────────────────────

    def _clipboard_loop(self):
        while True:
            try:
                if self.active and db.get_setting("check_clipboard", "true") != "false":
                    clip = pyperclip.paste() or ""
                    if clip and clip != self._last_clip and api.looks_checkable(clip):
                        self._last_clip = clip
                        self._reputation_check(clip, source="clipboard")
            except Exception:
                pass
            time.sleep(CLIP_INTERVAL)

    def _handle_url(self, url: str):
        if self.active and db.get_setting("check_browser", "true") != "false":
            self._reputation_check(url, source="browser")

    def _reputation_check(self, text: str, source: str):
        result = api.passive_check(text)
        if not result:
            return
        # Count every real check so the dashboard reflects activity.
        db.add_scan()
        risk = result.get("risk_level", "safe")
        # Only record + surface real-time hits that matter, so history stays
        # meaningful and we don't fire a notification on every safe page load.
        if risk in ("suspicious", "likely_scam"):
            db.add_history(text, result, source=source)
            if self._on_result:
                self._on_result(text, result)
