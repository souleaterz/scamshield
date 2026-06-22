"""
Guardurai — Windows Desktop App
Main entry point. Creates the pywebview application window and the
system-tray icon. The UI is rendered in the built-in Edge WebView2
runtime (pre-installed on Windows 10/11).
"""
import sys
import os
import json
import threading

import webview
import pystray
from PIL import Image, ImageDraw

import db
from protection import ProtectionEngine
from js_api import JsApi


# ── Resource path (works both in dev and in the PyInstaller bundle) ───────────

def res(relative: str) -> str:
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relative)


# ── Tray icon ─────────────────────────────────────────────────────────────────

def _make_tray_icon(state: str = "idle") -> Image.Image:
    colours = {
        "idle":       (29,  78, 216),
        "safe":       (16,  185, 129),
        "suspicious": (217, 119,  6),
        "scam":       (220,  38,  38),
    }
    fill = colours.get(state, colours["idle"])
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(32, 3), (61, 15), (61, 37), (32, 61), (3, 37), (3, 15)], fill=fill)
    if state == "scam":
        d.line([(22, 22), (42, 42)], fill="white", width=5)
        d.line([(42, 22), (22, 42)], fill="white", width=5)
    elif state == "suspicious":
        d.rectangle([(29, 20), (35, 36)], fill="white")
        d.rectangle([(29, 40), (35, 46)], fill="white")
    else:
        d.line([(20, 32), (28, 42), (44, 22)], fill="white", width=5)
    return img


# ── Main application ──────────────────────────────────────────────────────────

class GuarduraiApp:
    def __init__(self):
        self._window: webview.Window | None = None
        self._tray: pystray.Icon | None = None
        self._engine = ProtectionEngine()
        self._js_api = JsApi(self._engine)

    # ── Window helpers ────────────────────────────────────────────────────────

    def _show(self, *_):
        if self._window:
            self._window.show()
            self._window.restore()
            self._window.move_to_foreground()

    def _on_window_closing(self):
        """Minimise to tray instead of quitting when the user clicks ✕."""
        if self._window:
            self._window.hide()
        return False  # Cancel the close event

    # ── Threat callback (runs on protection engine thread) ────────────────────

    def _on_result(self, text: str, result: dict):
        risk = result.get("risk_level", "safe")

        # Update tray icon colour
        if self._tray:
            state = "scam" if risk == "likely_scam" else risk
            self._tray.icon = _make_tray_icon(state)
            self._tray.title = {
                "likely_scam": "Guardurai — ⚠ Scam detected!",
                "suspicious":  "Guardurai — Suspicious content",
            }.get(risk, "Guardurai — Looks safe")

        # Push to UI if window is visible
        if self._window:
            payload = json.dumps({"text": text, "result": result})
            self._window.evaluate_js(f"window.__onProtectionResult({payload})")

        # Windows toast notification for threats only
        if risk in ("likely_scam", "suspicious"):
            self._notify(risk, result.get("summary", ""))

        # Reset icon after a few seconds for non-threats
        if risk == "safe":
            import time
            def reset():
                time.sleep(4)
                if self._tray:
                    self._tray.icon = _make_tray_icon("idle")
                    self._tray.title = "Guardurai — Protected"
            threading.Thread(target=reset, daemon=True).start()

    @staticmethod
    def _notify(risk: str, summary: str):
        try:
            from plyer import notification
            title = "⚠ Guardurai — Likely Scam!" if risk == "likely_scam" else "⚠ Guardurai — Suspicious"
            notification.notify(
                title=title,
                message=summary or "Suspicious content detected.",
                app_name="Guardurai",
                timeout=7,
            )
        except Exception:
            pass

    # ── Tray menu ─────────────────────────────────────────────────────────────

    def _build_tray(self) -> pystray.Icon:
        menu = pystray.Menu(
            pystray.MenuItem("Open Guardurai", self._show, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", self._quit),
        )
        return pystray.Icon(
            "Guardurai", _make_tray_icon("idle"), "Guardurai — Protected", menu
        )

    def _quit(self, icon, item):
        icon.stop()
        if self._window:
            # Detach closing handler so the window actually closes
            self._window.events.closing -= self._on_window_closing
            self._window.destroy()

    # ── Run ───────────────────────────────────────────────────────────────────

    def run(self):
        db.init()

        self._window = webview.create_window(
            "Guardurai",
            res("ui/index.html"),
            js_api=self._js_api,
            width=980,
            height=660,
            min_size=(820, 560),
            resizable=True,
            text_select=False,
            background_color="#0d1117",
        )
        self._window.events.closing += self._on_window_closing

        # Tray runs in background thread
        self._tray = self._build_tray()
        threading.Thread(target=self._tray.run, daemon=True).start()

        # Protection engine (clipboard + URL monitor)
        self._engine.start(on_result=self._on_result)

        # pywebview must run on the main thread
        webview.start(debug=False)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    GuarduraiApp().run()
