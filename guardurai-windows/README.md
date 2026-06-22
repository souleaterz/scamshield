# Guardurai — Windows Desktop App

Real-time scam protection for Windows. Runs silently in the system tray and
monitors your clipboard — whenever you copy a link, phone number, or suspicious
message from **any app** (browser, email, WhatsApp, PDF, anything), it checks it
against Guardurai and shows a Windows notification with the verdict.

## Requirements
- Windows 10 or 11
- Python 3.9+ — download from https://www.python.org/downloads/  
  (**tick "Add Python to PATH"** during installation)

## Build the .exe (one time)
```
double-click build.bat
```
It installs dependencies, builds `dist\Guardurai.exe`, and tells you where to
find it. The whole thing takes about 60–90 seconds.

## Run
Double-click `dist\Guardurai.exe` — a shield icon appears in your system tray.

## How it works
| You do | Guardurai does |
|---|---|
| Copy a link | Checks it → green (safe), amber (suspicious), or red (scam) notification |
| Copy a phone number | Checks it against the scam database |
| Copy a WhatsApp message | Checks it for phishing patterns |
| Right-click tray icon → "Check clipboard now" | Instant manual check |
| Right-click → "Start with Windows" | Adds to Windows startup automatically |

Checking uses your **free Guardurai checks** (3/day). Sign up at guardurai.com
and upgrade for unlimited — the app uses your account automatically once you're
signed into the website (cookie-based, planned for v2 with in-app sign-in).

## Tray icon states
| Icon | Meaning |
|---|---|
| 🛡️ Blue + ✓ | Idle, protection active |
| 🛡️ Amber (…) | Checking now |
| 🛡️ Green + ✓ | Last check: safe |
| 🛡️ Amber + ! | Last check: suspicious |
| 🛡️ Red + ✗ | Last check: likely scam |

## Roadmap (v2)
- In-app sign-in (Clerk WebView) for Pro/Family unlimited checks
- SMS monitoring via Windows Phone Link integration
- History window showing recent checks
- Custom block-list

## Project layout
```
app.py            Main app — tray, clipboard monitor, notifications, auto-start
api.py            HTTP client for /api/analyze + clipboard heuristic
requirements.txt  Python dependencies
build.bat         One-click build to dist\Guardurai.exe
```
