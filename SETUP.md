# Guardurai — Phase 2 setup (auth + usage limits)

Phase 2 adds optional accounts (Clerk) and a daily usage limit backed by Supabase.
**Both are optional and degrade gracefully:** with neither configured, the app runs
exactly as it does today — anonymous, no enforced limit. Add each piece when ready.

How the daily limit works:
- **Signed-in users** are limited by their Clerk user ID.
- **Anonymous visitors** are limited by IP address.
- Free tier = **1 check/day** (UTC). Limit enforcement only turns on once Supabase
  is configured; until then every check is allowed (fails open).

---

## 1. Supabase — usage tracking + the daily limit

1. Create a project at https://supabase.com (free tier is fine).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`  ⚠️ server-only, never expose
4. Put both in `.env.local`.

Once set, the 1-check/day limit is enforced and every check is logged to `usage_checks`.

## 2. Clerk — optional accounts

1. Create an application at https://clerk.com.
2. **API Keys** → copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`
3. Put both in `.env.local`.

Once set, a Sign in / Sign up bar appears, and signed-in users are limited by
account instead of IP. No extra config needed — the modal sign-in works out of the box.

## 3. Restart

Env vars are read at server start, so restart the dev server after editing `.env.local`:

```bash
npm run dev
```

---

# Phase 3 — subscriptions (Stripe)

Stripe powers the Pro (£4.99/mo) and Unlimited (£9.99/mo) plans. Like everything
else it's optional: **until `STRIPE_SECRET_KEY` is set, the upgrade buttons return a
clean "not available yet" and everyone stays on free.** Requires Clerk (only signed-in
users can subscribe) and Supabase (the `subscriptions` table stores each user's tier).

## 1. Create products + prices

1. Create an account at https://stripe.com and stay in **Test mode** (toggle, top right).
2. **Product catalogue → Add product**, create two recurring products:
   - **Pro** — recurring, £4.99 / month
   - **Unlimited** — recurring, £9.99 / month
3. Copy each price's **Price ID** (`price_...`) → `STRIPE_PRICE_PRO` / `STRIPE_PRICE_UNLIMITED`.

## 2. API key

**Developers → API keys** → copy the **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`.

## 3. Add the subscriptions table

Re-run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor — it now
also creates the `subscriptions` table (safe to re-run; uses `create table if not exists`).

## 4. Webhook (keeps tiers in sync)

The webhook flips a user to Pro/Unlimited after payment and back to free on cancel.

**Local testing** — install the Stripe CLI, then:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
The CLI prints a signing secret (`whsec_...`) → put it in `STRIPE_WEBHOOK_SECRET`, restart.

**Production** — Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://your-domain/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the endpoint's signing secret → `STRIPE_WEBHOOK_SECRET`.

## 5. Test the flow

With all keys set + `stripe listen` running: sign in, hit your daily limit (or click an
upgrade button), and pay with Stripe's test card **`4242 4242 4242 4242`** (any future
expiry/CVC). You should land back on the app upgraded, and your tier should be `pro`/
`unlimited` in the `subscriptions` table.

---

## Your `.env.local` (full set)

```
ANTHROPIC_API_KEY=sk-ant-...

# Supabase (optional — enables the daily limit + subscriptions)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk (optional — enables accounts)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Stripe (optional — enables upgrades)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_UNLIMITED=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deploying to Vercel

Add the same variables under **Project → Settings → Environment Variables**. For Clerk,
use your **production** keys (`pk_live_…` / `sk_live_…`) and add your domain in the Clerk
dashboard. For Stripe, switch to **live mode**, recreate the products, use `sk_live_…` keys,
set `NEXT_PUBLIC_APP_URL` to your real domain, and add a production webhook endpoint
pointing at `https://your-domain/api/stripe/webhook`.

---

## Notes / decisions

- **Fail-open:** if Supabase is unconfigured or errors, checks are allowed rather than
  blocked — we'd rather let a scam check through than wall off a worried user.
- **Tiers:** anonymous + free users run on Haiku (1 check/day). Paying users are flipped
  to `pro` (Sonnet, 200/day) or `unlimited` (Sonnet, no cap, 30-day history) by the Stripe
  webhook, which writes their tier to the `subscriptions` table.
- **Billing fails safe:** if Stripe is unconfigured, upgrades return 503 and everyone stays
  free — the app never breaks, it just doesn't sell.
- **Privacy:** only verdict metadata (risk level, type, one-line summary) is stored —
  never the raw text or images users paste.
- **IP limiting** is best-effort and bypassable via VPN/new IP; that's an acceptable
  trade-off for a free tier and was the chosen approach over forcing sign-in.
