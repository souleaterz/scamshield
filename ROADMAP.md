# ScamShield roadmap

Goal: go from "AI reads your text and guesses" → **"ScamShield cross-checks hard
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

## 🚧 Partial

- [ ] **AdSense on free tier** — placeholder ad slot in place; real units pending account approval
- [x] **Verdict history** — `/history` page for signed-in users; shows last 50 checks with risk badge, type, summary, relative time

---

## ⬜ Near-term — hard signals (the differentiators)

Turn subjective AI guesses into verifiable checks. Most need a third-party API + key.

- [x] **URL / domain reputation** — domain age (RDAP) + heuristics (raw-IP, shorteners,
      risky TLDs, punycode, brand impersonation) fed into the verdict and shown in the card
  - [x] **Google Safe Browsing** — batched Lookup API v4, threat badges in card, CONFIRMED MALICIOUS in Claude prompt
  - [ ] Optional: urlscan.io / VirusTotal enrichment
- [ ] **Phone number intelligence** — format/carrier lookup + known-scam reputation
- [ ] **Email authenticity** — parse pasted headers for SPF/DKIM/DMARC + spoofing
- [ ] **Crypto address check** — match wallet addresses against scam-report databases

## ⬜ Mid-term — identity & media

- [ ] **Reverse image / identity verification** (romance & catfish scams)
  - [ ] Reverse image search on profile photos (TinEye / Vision / Bing Visual Search)
  - [ ] AI-generated / deepfake face detection
  - [ ] Combined "is this person real?" score
- [ ] **Business legitimacy (UK)** — Companies House lookup, FCA register for investment firms

## ⬜ Platform plays (longer term)

- [ ] **Community scam database** — user reports + match new inputs against them (network effect)
- [ ] **Passive browser protection** — proactively warn on risky pages/links
- [ ] **Public API / B2B** — let banks, marketplaces, dating apps embed ScamShield checks
- [ ] **Mobile app** — call/SMS screening where scams actually land
- [ ] **Multi-language support**

---

## ⬜ Launch hardening

- [ ] Clerk **production** instance + custom domain (`scamshield.io`)
- [ ] Confirm production Stripe webhook with a live test upgrade
- [ ] Rotate the dev/test API keys used during development
- [ ] Static route group for `/scams` (currently dynamic due to ClerkProvider in root layout)
- [ ] Extension store assets (screenshots, privacy policy) before publishing
