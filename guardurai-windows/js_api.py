"""
Python functions exposed to the JavaScript UI via pywebview's JS API bridge.
Every public method is callable from JS as: await pywebview.api.method_name(...)
Return values must be JSON-serialisable (we return JSON strings for safety).
"""
import json
import db
from protection import ProtectionEngine


class JsApi:
    def __init__(self, engine: ProtectionEngine):
        self._engine = engine

    # ── Scanning ──────────────────────────────────────────────────────────────

    def check(self, text: str) -> str:
        result = self._engine.check_manual(text)
        if result is None:
            return json.dumps({"error": "Couldn't reach Guardurai. Check your connection."})
        if result.get("_rate_limited"):
            return json.dumps({"error": "Daily free limit reached. Upgrade at guardurai.com for unlimited checks."})
        return json.dumps(result)

    # ── Data ──────────────────────────────────────────────────────────────────

    def get_history(self) -> str:
        return json.dumps(db.get_history(100))

    def get_stats(self) -> str:
        return json.dumps(db.get_stats())

    # ── Protection status ─────────────────────────────────────────────────────

    def get_protection_status(self) -> str:
        return json.dumps({"active": self._engine.active})

    def toggle_protection(self) -> str:
        self._engine.active = not self._engine.active
        db.set_setting("protection_active", str(self._engine.active).lower())
        return json.dumps({"active": self._engine.active})

    # ── Settings ──────────────────────────────────────────────────────────────

    def get_settings(self) -> str:
        return json.dumps({
            "notifications":   db.get_setting("notifications",   "true"),
            "check_clipboard": db.get_setting("check_clipboard", "true"),
            "check_browser":   db.get_setting("check_browser",   "true"),
        })

    def save_settings(self, settings_json: str) -> str:
        try:
            settings = json.loads(settings_json)
            for k, v in settings.items():
                db.set_setting(k, v)
            return json.dumps({"ok": True})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def is_autostart(self) -> str:
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                                r"Software\Microsoft\Windows\CurrentVersion\Run") as k:
                winreg.QueryValueEx(k, "Guardurai")
                return json.dumps({"enabled": True})
        except FileNotFoundError:
            return json.dumps({"enabled": False})

    def open_external(self, url: str) -> str:
        import webbrowser
        try:
            webbrowser.open(url)
            return json.dumps({"ok": True})
        except Exception as e:
            return json.dumps({"error": str(e)})

    # ── Account ───────────────────────────────────────────────────────────────

    def get_account(self) -> str:
        email = db.get_setting("account_email", "")
        if not email:
            return json.dumps({"signed_in": False})
        return json.dumps({
            "signed_in": True,
            "email": email,
            "name": db.get_setting("account_name", email),
            "tier": db.get_setting("account_tier", "free"),
        })

    def link_account(self, email: str) -> str:
        import requests as _req
        try:
            resp = _req.get(
                "https://guardurai.com/api/desktop/ping",
                params={"email": email},
                timeout=10,
            )
            data = resp.json()
            if resp.status_code == 200:
                db.set_setting("account_email", email)
                db.set_setting("account_name", data.get("name", email.split("@")[0]))
                db.set_setting("account_tier", data.get("tier", "free"))
                return json.dumps({"signed_in": True, **data})
            return json.dumps({"error": data.get("error", "not_found")})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def unlink_account(self) -> str:
        for key in ("account_email", "account_name", "account_tier"):
            db.set_setting(key, "")
        return json.dumps({"ok": True})

    def set_autostart(self, enable: bool) -> str:
        import sys, os, winreg
        key = r"Software\Microsoft\Windows\CurrentVersion\Run"
        exe = sys.executable if getattr(sys, "frozen", False) else os.path.abspath("app.py")
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key, 0, winreg.KEY_SET_VALUE) as k:
                if enable:
                    winreg.SetValueEx(k, "Guardurai", 0, winreg.REG_SZ, f'"{exe}"')
                else:
                    try:
                        winreg.DeleteValue(k, "Guardurai")
                    except FileNotFoundError:
                        pass
            return json.dumps({"ok": True})
        except Exception as e:
            return json.dumps({"error": str(e)})
