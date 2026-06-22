# Guardurai — Android app

A native Android (Kotlin + Jetpack Compose) client for Guardurai. It reuses the
existing web backend (`https://guardurai.com/api/analyze`), so there's no new
server to run.

## What it does (v1 — this MVP)
- **Paste & check** — paste any suspicious message, link, or phone number and
  get an instant Safe / Suspicious / Likely-Scam verdict with red flags.
- **Share to Guardurai** — registered as a system share target, so users can
  share a dodgy SMS, WhatsApp message, or link from *any* app straight into
  Guardurai to check it (no special permissions needed). Opening from a share
  auto-runs the check.

Anonymous requests use the free tier (a few checks/day). Sign-in + paid tiers
can be added later (see roadmap).

## Build & run
1. Install **Android Studio** (Hedgehog or newer).
2. **File → Open** → select this `guardurai-android` folder.
3. Let Gradle sync (Android Studio will download the Gradle wrapper, SDK, and
   dependencies automatically). If prompted, install the Android SDK 34
   platform.
4. Plug in an Android phone (USB debugging on) or start an emulator, then press
   **Run ▶**.

> If you build from the command line instead, first generate the wrapper once:
> `gradle wrapper --gradle-version 8.7`, then `./gradlew assembleDebug`.

Min SDK 24 (Android 7.0+), target SDK 34.

## Test the share flow
On the device: open Messages (or any app), long-press a text, tap **Share**,
choose **Guardurai** — it should open and check the message automatically.

## Roadmap (v2+)
- **SMS scam screening** — auto-scan incoming texts for scam links/numbers and
  notify (uses `RECEIVE_SMS`; Play Store requires declaring this as a caller-ID
  / spam-protection app, which Guardurai qualifies for).
- **Call screening** — a `CallScreeningService` that flags incoming numbers
  found in the Guardurai scam database.
- **Accounts** — sign in (Clerk) for Pro/Family features and history.
- **Real-time link protection** — a VPN-based or accessibility-based URL check
  while browsing (heavier; later).

## Project layout
```
app/src/main/
  AndroidManifest.xml                      launcher + SEND (share) intent filters
  java/com/guardurai/app/
    MainActivity.kt                        Compose UI (check screen + verdict card)
    GuarduraiApi.kt                        OkHttp client for /api/analyze
  res/values/                              strings + theme
```
