"""
Guardurai — Windows real-time scam protection
Runs quietly in the system tray and monitors your clipboard. Whenever you
copy a link, phone number, or suspicious message, it checks it against the
Guardurai database and AI, then shows a Windows notification with the verdict.

Build to a single .exe: run build.bat
"""
import sys
import threading
import time
import winreg
import os

import pyperclip
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as Item, Menu

import api

# ── Config ────────────────────────────────────────────────────────────────────

POLL_INTERVAL = 1.5   # seconds between clipboard checks
AUTOSTART_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
AUTOSTART_NAME = "Guardurai"

# ── Tray icon ─────────────────────────────────────────────────────────────────

def _make_icon(state: str = "idle") -> Image.Image:
    """
    Draw a shield icon programmatically.
    state: 'idle' (blue), 'checking' (amber), 'safe' (green),
           'suspicious' (amber), 'scam' (red)
    """
    colours = {
        "idle":       (29,  78, 216),   # blue
        "checking":   (217, 119,  6),   # amber
        "safe":       (16,  185, 129),  # emerald
        "suspicious": (217, 119,  6),   # amber
        "scam":       (220,  38,  38),  # red
    }
    fill = colours.get(state, colours["idle"])

    sz = 64
    img = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Shield silhouette
    shield = [(sz//2, 3), (sz-3, 15), (sz-3, 37), (sz//2, sz-3), (3, 37), (3, 15)]
    d.polygon(shield, fill=fill)

    # White symbol inside shield
    if state == "scam":
        # X mark
        d.line([(22, 22), (42, 42)], fill="white", width=5)
        d.line([(42, 22), (22, 42)], fill="white", width=5)
    elif state == "suspicious":
        # Exclamation mark
        d.rectangle([(29, 20), (35, 36)], fill="white")
        d.rectangle([(29, 40), (35, 46)], fill="white")
    elif state == "checking":
        # Animated dots (static spinner look)
        for i, pos in enumerate([(22, 30), (30, 24), (38, 30)]):
            d.ellipse([pos[0]-3, pos[1]-3, pos[0]+3, pos[1]+3], fill="white")
    else:
        # Checkmark (idle + safe)
        d.line([(20, 32), (28, 42), (44, 22)], fill="white", width=5)

    return img


# ── Notifications ─────────────────────────────────────────────────────────────

def _notify(title: str, body: str):
    """Show a Windows 10/11 toast notification via plyer."""
    try:
        from plyer import notification
        notification.notify(
            title=title,
            message=body,
            app_name="Guardurai",
            timeout=7,
        )
    except Exception:
        pass  # Notifications are best-effort


# ── Auto-start ─────────────────────────────────────────────────────────────────

def _is_autostart() -> bool:
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY) as k:
            winreg.QueryValueEx(k, AUTOSTART_NAME)
            return True
    except FileNotFoundError:
        return False


def _set_autostart(enable: bool):
    with winreg.OpenKey(
        winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE
    ) as k:
        if enable:
            exe = sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__)
            winreg.SetValueEx(k, AUTOSTART_NAME, 0, winreg.REG_SZ, f'"{exe}"')
        else:
            try:
                winreg.DeleteValue(k, AUTOSTART_NAME)
            except FileNotFoundError:
                pass


# ── Clipboard monitor ─────────────────────────────────────────────────────────

class ClipboardMonitor:
    def __init__(self, on_result):
        self._on_result = on_result
        self._last = ""
        self._paused = False

    def pause(self): self._paused = True
    def resume(self): self._paused = False

    def run_forever(self):
        while True:
            try:
                if not self._paused:
                    clip = pyperclip.paste() or ""
                    if clip and clip != self._last and api.looks_checkable(clip):
                        self._last = clip
                        result = api.check(clip)
                        self._on_result(clip, result)
            except Exception:
                pass
            time.sleep(POLL_INTERVAL)


# ── Tray app ──────────────────────────────────────────────────────────────────

class TrayApp:
    def __init__(self):
        self._icon = pystray.Icon(
            "Guardurai",
            _make_icon("idle"),
            "Guardurai — Scam Protection",
        )
        self._monitor = ClipboardMonitor(self._on_result)
        self._last_risk = "idle"

    # ── Handlers ─────────────────────────────────────────────────────────────

    def _on_result(self, text: str, result: dict | None):
        if result is None:
            return

        if result.get("_rate_limited"):
            _notify(
                "Guardurai — Daily limit reached",
                "You've used today's free checks. Visit guardurai.com to upgrade.",
            )
            return

        risk = result.get("risk_level", "safe")
        summary = result.get("summary", "")
        detected = result.get("detected_type", "")

        self._last_risk = risk
        self._icon.icon = _make_icon(risk)

        if risk == "likely_scam":
            self._icon.title = "Guardurai — ⚠ Scam detected!"
            _notify(
                "⚠ Guardurai — Likely Scam!",
                summary or f"Scam detected: {detected}. Do not click or share.",
            )
        elif risk == "suspicious":
            self._icon.title = "Guardurai — Suspicious content"
            _notify(
                "⚠ Guardurai — Suspicious",
                summary or "This looks suspicious. Proceed with caution.",
            )
        else:
            # Quietly update icon for safe checks — don't notify every safe copy.
            self._icon.title = "Guardurai — Looks safe"
            # Reset to idle after a short delay so safe doesn't persist forever.
            threading.Timer(4, self._reset_icon).start()

    def _reset_icon(self):
        self._icon.icon = _make_icon("idle")
        self._icon.title = "Guardurai — Scam Protection"

    # ── Tray menu actions ──────────────────────────────────────────────────────

    def _check_now(self, icon, item):
        """Check whatever is currently in the clipboard."""
        clip = ""
        try:
            clip = pyperclip.paste() or ""
        except Exception:
            pass

        if not clip.strip():
            _notify("Guardurai", "Nothing in the clipboard to check. Copy a link or message first.")
            return

        self._icon.icon = _make_icon("checking")
        self._icon.title = "Guardurai — Checking…"
        self._monitor.pause()

        def do():
            result = api.check(clip)
            self._on_result(clip, result)
            if result and not result.get("_rate_limited"):
                risk = result.get("risk_level", "safe")
                if risk == "safe":
                    # Show explicit safe notification on manual check.
                    _notify("✓ Guardurai — Looks safe", result.get("summary", "Nothing suspicious found."))
            self._monitor.resume()

        threading.Thread(target=do, daemon=True).start()

    def _toggle_autostart(self, icon, item):
        _set_autostart(not _is_autostart())
        self._icon.update_menu()

    def _open_web(self, icon, item):
        import webbrowser
        webbrowser.open("https://guardurai.com")

    def _quit(self, icon, item):
        icon.stop()

    # ── Menu ──────────────────────────────────────────────────────────────────

    def _build_menu(self):
        return Menu(
            Item("Check clipboard now", self._check_now, default=True),
            Menu.SEPARATOR,
            Item(
                "Start with Windows",
                self._toggle_autostart,
                checked=lambda _: _is_autostart(),
            ),
            Item("Open guardurai.com", self._open_web),
            Menu.SEPARATOR,
            Item("Quit", self._quit),
        )

    # ── Run ───────────────────────────────────────────────────────────────────

    def run(self):
        self._icon.menu = self._build_menu()

        # Clipboard monitor runs in a background daemon thread.
        t = threading.Thread(target=self._monitor.run_forever, daemon=True)
        t.start()

        _notify(
            "Guardurai is running",
            "Real-time scam protection is active. Copy any link or message to check it.",
        )

        self._icon.run()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    TrayApp().run()
