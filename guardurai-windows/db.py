"""
Local SQLite database — history, stats, settings.
Stored in %USERPROFILE%\.guardurai\guardurai.db
"""
import sqlite3
import json
import os
from datetime import datetime

_DB_DIR = os.path.join(os.path.expanduser("~"), ".guardurai")
DB_PATH = os.path.join(_DB_DIR, "guardurai.db")


def init():
    os.makedirs(_DB_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH) as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                input       TEXT    NOT NULL,
                risk_level  TEXT    NOT NULL,
                summary     TEXT,
                detected_type TEXT,
                confidence  INTEGER DEFAULT 0,
                red_flags   TEXT    DEFAULT '[]',
                advice      TEXT    DEFAULT '[]',
                source      TEXT    DEFAULT 'manual',
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS scans (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)


def add_scan() -> None:
    """Record that a real-time/manual check ran, so the dashboard can show the
    volume of activity (every page checked), not only the threats caught."""
    with sqlite3.connect(DB_PATH) as c:
        c.execute("INSERT INTO scans DEFAULT VALUES")


def add_history(input_text: str, result: dict, source: str = "manual") -> None:
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            """INSERT INTO history
               (input, risk_level, summary, detected_type, confidence, red_flags, advice, source)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                input_text[:500],
                result.get("risk_level", "safe"),
                result.get("summary", ""),
                result.get("detected_type", ""),
                result.get("confidence", 0),
                json.dumps(result.get("red_flags", [])),
                json.dumps(result.get("advice", [])),
                source,
            ),
        )


def get_history(limit: int = 100) -> list[dict]:
    with sqlite3.connect(DB_PATH) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(
            "SELECT * FROM history ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    out = []
    for r in rows:
        red_flags = json.loads(r["red_flags"] or "[]")
        advice = json.loads(r["advice"] or "[]")
        created = r["created_at"] or ""
        # SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; make it an ISO string the
        # browser's Date() parses correctly (otherwise the UI shows "Invalid Date").
        checked_at = created.replace(" ", "T") + "Z" if created else ""
        # Map DB columns to the field names the UI reads.
        out.append({
            "input_text": r["input"],
            "risk_level": r["risk_level"],
            "source": r["source"],
            "checked_at": checked_at,
            "result_json": {
                "risk_level": r["risk_level"],
                "summary": r["summary"],
                "detected_type": r["detected_type"],
                "confidence": r["confidence"],
                "red_flags": red_flags,
                "advice": advice,
            },
        })
    return out


def get_stats() -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    with sqlite3.connect(DB_PATH) as c:
        # Total/today = everything we checked (the scans counter), so normal
        # browsing visibly registers. Threats = the scams we actually caught.
        total = c.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
        today_n = c.execute(
            "SELECT COUNT(*) FROM scans WHERE date(created_at)=?", (today,)
        ).fetchone()[0]
        threats = c.execute(
            "SELECT COUNT(*) FROM history WHERE risk_level='likely_scam'"
        ).fetchone()[0]
    return {"total": total, "today": today_n, "threats_blocked": threats}


def get_setting(key: str, default: str = "") -> str:
    with sqlite3.connect(DB_PATH) as c:
        row = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row[0] if row else default


def set_setting(key: str, value: str) -> None:
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", (key, str(value))
        )
