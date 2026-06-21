# Guardurai — Chrome Web Store listing

Copy each field into the Chrome Web Store Developer Dashboard
(chrome.google.com/webstore/devconsole). Fields are grouped by the dashboard
tab they live in.

---

## Store listing tab

### Name (max 75 chars)
```
Guardurai — AI Scam & Phishing Protection
```

### Summary / short description (max 132 chars)
```
Real-time scam & phishing protection. Check any link, message, phone number, email or photo for fraud with one click.
```

### Category
```
Productivity   (alt: Tools)
```

### Language
```
English (United Kingdom)
```

### Detailed description (max 16,000 chars)
```
Guardurai is your personal scam bodyguard. It warns you the moment you land on a
known scam or phishing site — and lets you check any suspicious message, link,
phone number, email, company, or profile photo in one click.

Scammers are getting smarter and using AI. Guardurai uses AI to fight back.

━━━━━━━━━━━━━━━━━━━━━━
REAL-TIME PROTECTION (FREE)
━━━━━━━━━━━━━━━━━━━━━━
As you browse, Guardurai quietly checks pages against a live database of known
scam and phishing sites — fed by global threat feeds and our own community. If
you land on a dangerous page, you get a clear red warning BEFORE you enter
details or pay. No thinking required. Completely free.

━━━━━━━━━━━━━━━━━━━━━━
CHECK ANYTHING IN ONE CLICK
━━━━━━━━━━━━━━━━━━━━━━
• Suspicious text or DM? Select it, right-click, "Check with Guardurai".
• Dodgy email? A check button appears right inside Gmail, Outlook, Yahoo, iCloud,
  Proton and AOL — no copy-pasting.
• Get an instant verdict — Safe, Suspicious, or Likely Scam — with the red flags
  explained in plain English.

━━━━━━━━━━━━━━━━━━━━━━
WHAT IT CATCHES
━━━━━━━━━━━━━━━━━━━━━━
✓ Phishing & fake login pages
✓ Fake delivery / bank / HMRC texts
✓ Scam phone numbers and premium-rate traps
✓ Look-alike and newly-registered scam domains
✓ Romance scams & catfish — reverse-image search + AI deepfake detection on
  profile photos
✓ Fake companies & investments — checked against Companies House and the FCA
  register
✓ Email spoofing (SPF/DKIM/DMARC)

━━━━━━━━━━━━━━━━━━━━━━
PROTECT THE PEOPLE YOU LOVE
━━━━━━━━━━━━━━━━━━━━━━
Scammers target the trusting — parents, grandparents. With Guardurai Family you
can protect up to 5 people and get an email alert the moment one of them runs
into a likely scam, so you can step in before any money is lost.

━━━━━━━━━━━━━━━━━━━━━━
PRIVATE BY DESIGN
━━━━━━━━━━━━━━━━━━━━━━
We only check what's needed to keep you safe, and we never sell your data. The
raw content of your checks isn't stored. See our privacy policy:
https://guardurai.com/privacy

━━━━━━━━━━━━━━━━━━━━━━
PRICING
━━━━━━━━━━━━━━━━━━━━━━
• Free — real-time scam-site protection + 3 checks a day
• Pro — unlimited checks + photo/identity & company checks
• Family — protect up to 5 loved ones with scam alerts

Guardurai gives guidance, not a guarantee. Always verify independently before
sending money or sharing personal details.

Start free at https://guardurai.com
```

---

## Privacy tab

### Single purpose (required)
```
Guardurai protects users from online scams and phishing. It warns users in real
time when they visit a known scam site, and lets them check links, messages,
phone numbers, emails, companies, and profile photos for signs of fraud.
```

### Permission justifications (required — one per permission)

**host_permissions: `<all_urls>`**
```
Real-time scam protection must run on every website the user visits so it can
warn them BEFORE they interact with a scam or phishing page. The extension sends
only the page's URL to our scam database for a fast safety check; it does not
read or transmit page content during passive protection. Access to all sites is
essential to the extension's core protective purpose.
```

**contextMenus**
```
Adds a right-click "Check with Guardurai" option so users can check selected
suspicious text on any page.
```

**scripting**
```
Injects the in-page warning banner that alerts users when they are on a known
scam site, and the result overlay shown after a manual check.
```

**activeTab**
```
Reads the current tab's URL or the user-selected text only when the user
explicitly runs a check, so it can be analysed for scams.
```

**storage**
```
Caches recent site-safety results locally and stores user preferences to reduce
repeat network requests and keep protection fast.
```

**Remote code**
```
No. All executable code is included in the extension package. The extension only
makes API calls to guardurai.com to return scam-check results (data, not code).
```

### Data usage disclosures (tick these in the dashboard)
- **Website content / web history**: COLLECTED — the URL of pages you visit is
  sent to Guardurai to check against the scam database. Content you submit for a
  manual check (text, link, image) is sent for analysis.
- **Personally identifiable information**: only if the user signs in (email, via
  our auth provider).
- Affirm all three compliance checkboxes:
  - ✓ I do not sell or transfer user data to third parties (outside approved use cases)
  - ✓ I do not use or transfer user data for purposes unrelated to the item's single purpose
  - ✓ I do not use or transfer user data to determine creditworthiness or for lending

### Privacy policy URL
```
https://guardurai.com/privacy
```

---

## Graphic assets (you must create / upload these)

| Asset | Size | Required | Notes |
|---|---|---|---|
| Store icon | 128×128 PNG | ✅ | Already have: extension/icons/icon128.png |
| Screenshots | 1280×800 (or 640×400) PNG | ✅ 1–5 | See plan below |
| Small promo tile | 440×280 PNG | ⬜ recommended | Boosts placement |
| Marquee promo | 1400×560 PNG | ⬜ optional | For featured spots |

### Screenshot plan (capture 5, 1280×800)
1. **The red scam-site warning banner** on a page — the hero shot. Caption:
   "Get warned the instant you hit a scam site."
2. **Right-click → "Check with Guardurai"** on selected text. Caption:
   "Check any suspicious message in one click."
3. **A verdict result** (Likely Scam with red flags). Caption:
   "Instant AI verdict with the red flags explained."
4. **The in-Gmail check button** on a phishing email. Caption:
   "Built into your inbox — Gmail, Outlook, Yahoo & more."
5. **The Photo / 'Is this person real?' result** OR the Family alert email.
   Caption: "Spot catfish, deepfakes — and protect your family."

---

## Pre-submit checklist
- [ ] Manifest version bumped if needed (currently 1.5.0)
- [ ] Privacy policy live at https://guardurai.com/privacy ✅
- [ ] All host URLs point to guardurai.com (no preview URLs) ✅
- [ ] Zip the extension/ folder contents (manifest.json at the root of the zip)
- [ ] One-time $5 Chrome Web Store developer registration fee paid
- [ ] Screenshots created (5)
- [ ] Expect 1–3 days review; `<all_urls>` + web-history disclosure may add a day
```
