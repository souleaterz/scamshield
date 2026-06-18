# ScamShield — Phase 2 setup (auth + usage limits)

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

## Your `.env.local` (full set)

```
ANTHROPIC_API_KEY=sk-ant-...

# Supabase (optional — enables the daily limit)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk (optional — enables accounts)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

## Deploying to Vercel

Add the same variables under **Project → Settings → Environment Variables**. For Clerk,
use your **production** keys (`pk_live_…` / `sk_live_…`) and add your domain in the Clerk
dashboard.

---

## Notes / decisions

- **Fail-open:** if Supabase is unconfigured or errors, checks are allowed rather than
  blocked — we'd rather let a scam check through than wall off a worried user.
- **Tiers:** everyone is `free` (Haiku) for now. Stripe billing in phase 3 will flip
  paying users to `pro` (Sonnet, higher limit) — the plumbing already accepts a tier.
- **Privacy:** only verdict metadata (risk level, type, one-line summary) is stored —
  never the raw text or images users paste.
- **IP limiting** is best-effort and bypassable via VPN/new IP; that's an acceptable
  trade-off for a free tier and was the chosen approach over forcing sign-in.
