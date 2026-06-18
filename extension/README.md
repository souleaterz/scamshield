# ScamShield browser extension

A Manifest V3 extension that lets people check whether something is a scam without
leaving the page — select any text, right-click, and **Check with ScamShield** — or
paste into the toolbar popup. Results come from the ScamShield API (`/api/analyze`).

## Load it for testing (Chrome / Edge)

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this `extension/` folder.
4. Select text on any page → right-click → **Check "…" with ScamShield**, or click the
   toolbar icon to paste-and-check.

Firefox: `about:debugging` → **This Firefox** → **Load Temporary Add-on** → pick
`manifest.json`.

## Configuration

The API endpoint is set in [`config.js`](config.js):

```js
const SCAMSHIELD_API = "https://scamshield-roan.vercel.app";
```

To test against a local dev server, set it to `http://localhost:3000` **and** add that
origin to `host_permissions` in [`manifest.json`](manifest.json).

## How it works

- `background.js` — service worker. Registers the right-click menu, calls the API, and
  injects a self-contained Shadow-DOM result card into the page (`renderOverlay`).
- `popup.html` / `popup.js` — the toolbar popup; calls the same API directly.
- Cross-origin requests work because the API domain is in `host_permissions` (the browser
  grants the extension access — no server CORS changes needed).

## Notes & limitations

- **Checks are anonymous** (no sign-in), so they count against the **free 1/day per-IP**
  limit. Sharing a signed-in Pro session with the extension would need extra auth work.
- **Icons** are intentionally omitted so the folder loads cleanly; the browser shows a
  default icon. Add 16/32/48/128px PNGs and an `"icons"` block + `action.default_icon`
  before publishing.
- Injection is skipped on restricted pages (`chrome://`, the Web Store, PDF viewer).

## Publishing (later)

Zip the contents of this folder and upload to the Chrome Web Store / Edge Add-ons /
Firefox AMO. You'll need icons, a privacy policy, and store listing assets first.
