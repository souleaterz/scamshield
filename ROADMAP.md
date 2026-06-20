# Guardurai roadmap

Goal: go from "AI reads your text and guesses" → **"Guardurai cross-checks hard
signals across identity, links, money, and phones"** — the thing that makes it the
go-to scam checker.

Legend: ✅ done · 🚧 partial · ⬜ planned

---

## ✅ Shipped

- [x] **MVP** — universal input (text + image/screenshot), Claude verdict, verdict card
- [x] **Optional accounts** (Clerk) with graceful anonymous fallback
- [x] **Usage limits** (Supabase) — free 1/day, keyed by Clerk user or IP
- [x] **Tiers + billing** (Stripe) — Free (Haiku) / Pro / Unlimited (Sonnet), webhook tier sync
- [x] **Billing management** — Stripe portal + sign-in-first upgrade flow
- [x] **SEO scam-guide pages** — 6 guides, `/scams` hub, sitemap, robots, FAQ JSON-LD
- [x] **Browser extension (MV3)** — right-click check, popup, in-page overlay
  - [x] Deep-link "see full result" on the site (no re-check)
  - [x] "Scan this page" screenshot check
  - [x] Uses the signed-in user's plan (sends session)
- [x] **Branding** — shield mark, site favicon, extension icons
- [x] **Verdict card redesign** — risk banner, confidence, grouped red flags + advice
- [x] **Shareable result cards** — `/r/<id>` link + dynamic branded OG image
- [x] **Verdict history** — `/history` page for signed-in users; shows last 50 checks with risk badge, type, summary, relative time

## 🚧 Partial

- [ ] **AdSense on free tier** — placeholder ad slot in place; real units pending account approval

---

## ✅ Hard signals (the differentiators)

- [x] **URL / domain reputation** — domain age (RDAP) + heuristics (raw-IP, shorteners,
      risky TLDs, punycode, brand impersonation) fed into the verdict and shown in the card
  - [x] **Google Safe Browsing** — batched Lookup API v4, threat badges in card, CONFIRMED MALICIOUS in Claude prompt
  - [ ] Optional: urlscan.io / VirusTotal enrichment
- [x] **Phone number intelligence** — libphonenumber-js parse/validate, line-type heuristics (premium-rate, VoIP, personal numbers), optional AbstractAPI carrier lookup; findings fed to Claude + shown in verdict card
- [x] **Email authenticity** — parse pasted headers for SPF/DKIM/DMARC + brand impersonation detection; Gmail extension button auto-extracts email content for one-click analysis
- [ ] **Crypto address check** — match wallet addresses against scam-report databases

## ✅ Identity & media

- [x] **Reverse image / identity verification** (romance & catfish scams)
  - [x] Reverse image search on profile photos (Google Cloud Vision web detection)
  - [x] AI-generated / deepfake face detection (Sightengine + Claude visual analysis)
  - [x] Combined "is this person real?" score (0–100 Real Score with verdict)
- [x] **Business legitimacy (UK)** — Companies House lookup (company status, age, address) + FCA Financial Services Register check; dedicated "Check Company" tab with 0–100 legitimacy score

## ✅ Community & platform

- [x] **Community scam database** — `scam_reports` table keyed by domain/phone; "Report as scam" button after every verdict; community matches fed to Claude as STRONG evidence + shown in verdict card before other checks. Seeded from FCA Warning List + URLhaus via `scripts/seed-scam-db.mjs`
- [x] **Passive browser protection** — content script runs on every page, skips known-safe domains, sends URL to background worker → /api/passive-check (community DB + heuristics + Safe Browsing, no Claude, no RDAP). Shadow DOM banner injected on suspicious/scam pages with dismiss + "Check with AI" link. Results cached 1h per domain.
- [x] **Entity pages** — auto-generated public page for every domain/phone/company searched (`/c/domain/…`, `/c/phone/…`, `/c/company/…`). Verdict, check count, community comments, ISR.
- [x] **Community flagging + inline report form** — users mark a result wrong with a comment; flags upgrade risk level and feed future verdicts. Form shown after every check.
- [x] **Reddit scam import** — daily cron scrapes r/ScamNumbers + r/isthisascam, creates entity pages, imports post text as community comment.
- [x] **Live scams feed** — homepage "Latest Guardurai Scams" feed from recently flagged entity pages (60s cache).
- [x] **SEO on entity pages** — FAQPage JSON-LD for Google rich snippets, entity pages in sitemap, sitewide ExtensionCTA banner.

---

## ⬜ Tomorrow — launch sprint

### 🔑 Production keys + domain
- [ ] **Custom domain** — buy `guardurai.com` (or `.io`), point to Vercel, configure SSL
- [ ] **Clerk production instance** — swap test keys for production keys in Vercel env vars; set the production Clerk domain to match the custom domain; rotate old test keys
- [ ] **Stripe live mode** — swap test keys for live keys; recreate the Pro £4.99/mo product in live mode; update webhook endpoint to production URL; verify a real card checkout end-to-end
- [ ] **Confirm Stripe webhook** — trigger a live test upgrade, check Vercel function logs, confirm `subscriptions` table syncs and tier flips to `pro`
- [ ] **Set NEXT_PUBLIC_APP_URL** to the production domain so sitemap/OG/canonical all use the real URL
- [ ] **Rotate all dev keys** exposed during development (Anthropic, Stripe, Clerk)

### 🧩 Extension — multi-email-client support
- [ ] **Outlook Web** — detect `div[data-convid]` (OWA) and inject "Check with Guardurai" button into the reading pane
- [ ] **Apple Mail / Yahoo Mail** — detect their DOM, inject check button on message open
- [ ] **Generic webmail** — fallback: selection-based context menu already works; add a floating check button when ≥50 chars is selected on any page
- [ ] **Extension onboarding page** — show on install (`chrome.runtime.onInstalled`); explain what it does, link to Pro plan, ask for notification permission
- [ ] **Chrome Web Store submission** — store listing assets (icon 128px, 440×280 screenshots ×5, privacy policy URL, short/long description). Privacy policy page needed at `/privacy`.

### 💰 Monetisation polish
- [ ] **Trial flow** — 3-day free Pro trial on first signup; Stripe trial_period_days=3; show countdown in AuthHeader
- [ ] **Upgrade nudge in extension** — when free limit hit in overlay/popup, show upgrade prompt with direct checkout link (deep-link into Stripe)
- [ ] **Manage billing from extension popup** — link to Stripe portal so Pro users can cancel without leaving the browser

### 🔍 SEO quick wins
- [ ] **`/privacy` and `/terms` pages** — required for Chrome Web Store + Clerk production + Google AdSense; plain text is fine
- [ ] **Google Search Console** — submit the sitemap once the custom domain is live; verify ownership via DNS TXT record
- [ ] **Open Graph image for entity pages** — right now entity pages use the default OG image; generate a dynamic one (next/og) showing the entity name + verdict badge

---

## ⬜ Near-term (week 2+)

### Extension
- [ ] **Firefox Add-ons** — same MV3 manifest works with minor adjustments; second store = more organic installs
- [ ] **Safari extension** — lower priority; requires macOS + Apple dev account; worth it if iOS traffic grows
- [ ] **Email client native apps** — Outlook desktop / Apple Mail plugins (longer term, separate tech stack)

### Product
- [ ] **SMS / iMessage link scanner** — companion iOS shortcut or Android app that accepts a "Share" from Messages
- [ ] **WhatsApp group link scanner** — detect wa.me and group invite links; risky group invites are a common scam vector
- [ ] **Crypto address check** — match wallet addresses against scam-report databases (Chainabuse API)
- [ ] **Bulk upload for businesses** — CSV of links/numbers → batch verdict; target HR teams, bank fraud teams
- [ ] **Webhook alert** — Pro+ feature; user provides a webhook URL; we POST when any entity they've checked gets newly flagged by the community
- [ ] **Public API / B2B** — let banks, marketplaces, dating apps embed Guardurai checks via API key

### Growth
- [ ] **Referral programme** — share a link, both parties get +7 days Pro
- [ ] **"Scam of the week" email digest** — weekly email (Resend) to all users listing top flagged entities; drives retention + backlinks
- [ ] **Partner with consumer charities / Action Fraud** — free Pro accounts for verified victim support orgs; earns backlinks + press
- [ ] **AdSense on free tier** — ad slot is already in place; apply once domain is live and has real traffic (Google requires established site)
- [ ] **Mobile app** — call/SMS screening where scams actually land (React Native; shares API with web)
- [ ] **Multi-language** — Spanish, French, Portuguese; same Claude prompt, just system-language hint

### Tech debt / polish
- [ ] Static route group for `/scams` (currently dynamic due to ClerkProvider in root layout — no real harm, just slower build)
- [ ] `urlscan.io` / VirusTotal enrichment for URL checks (optional add-on to GSB)
- [ ] End-to-end tests for the checkout → webhook → tier sync flow
