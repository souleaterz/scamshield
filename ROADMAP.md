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

## ⬜ Platform plays (longer term)

- [ ] **Public API / B2B** — let banks, marketplaces, dating apps embed Guardurai checks
- [ ] **Mobile app** — call/SMS screening where scams actually land
- [ ] **Multi-language support**

---

## ⬜ Launch hardening

- [ ] Clerk **production** instance + custom domain (`scamshield.io`)
- [ ] Confirm production Stripe webhook with a live test upgrade
- [ ] Rotate the dev/test API keys used during development
- [ ] Static route group for `/scams` (currently dynamic due to ClerkProvider in root layout)
- [ ] Extension store assets (screenshots, privacy policy) before publishing
