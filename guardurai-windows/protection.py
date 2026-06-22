"""
Protection engine — coordinates clipboard + URL monitoring,
fires a callback whenever a result arrives so the UI can update.
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
        threading.Thread(target=self._clipboard_loop, daemon=True).start()
        UrlMonitor(on_url=self._handle_url).start()

    def check_manual(self, text: str) -> dict | None:
        result = api.check(text)
        if result and not result.get("_rate_limited"):
            db.add_history(text, result, source="manual")
        return result

    # ── Internal ─────────────────────────────────────────────────────────────

    def _clipboard_loop(self):
        while True:
            try:
                if self.active:
                    clip = pyperclip.paste() or ""
                    if clip and clip != self._last_clip and api.looks_checkable(clip):
                        self._last_clip = clip
                        self._fire(clip, source="clipboard")
            except Exception:
                pass
            time.sleep(CLIP_INTERVAL)

    def _handle_url(self, url: str):
        if self.active:
            self._fire(url, source="browser")

    def _fire(self, text: str, source: str):
        result = api.check(text)
        if result and not result.get("_rate_limited"):
            db.add_history(text, result, source=source)
            if self._on_result:
                self._on_result(text, result)
