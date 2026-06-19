-- ScamShield usage tracking + daily rate limiting.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists public.usage_checks (
  id              uuid primary key default gen_random_uuid(),
  identifier      text not null,                 -- "user:<clerkId>" or "ip:<addr>"
  identifier_type text not null check (identifier_type in ('ip', 'user')),
  tier            text not null default 'free',
  risk_level      text,
  detected_type   text,
  summary         text,
  created_at      timestamptz not null default now()
);

-- Fast "how many checks today for this identifier" lookups.
create index if not exists usage_checks_identifier_created_idx
  on public.usage_checks (identifier, created_at desc);

-- Lock the table down. The app talks to it only via the service-role key
-- (server-side), which bypasses RLS — so no public policies are needed.
-- This ensures the anon/public key can never read or write usage data.
alter table public.usage_checks enable row level security;


-- Subscriptions: one row per signed-in user, kept in sync by the Stripe webhook.
-- The user_id is the Clerk user ID. Drives which tier (and model + limit) a user gets.
create table if not exists public.subscriptions (
  user_id                text primary key,            -- Clerk user ID
  stripe_customer_id     text,
  stripe_subscription_id text,
  tier                   text not null default 'free' -- 'free' | 'pro' | 'unlimited'
                           check (tier in ('free', 'pro', 'unlimited')),
  status                 text,                         -- Stripe subscription status
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

-- Same lockdown: written only by the server via the service-role key.
alter table public.subscriptions enable row level security;


-- Shared verdicts: created when a user taps "Share". Holds only the verdict
-- headline (never the raw input the user pasted). Read publicly via short id.
create table if not exists public.shared_verdicts (
  id            text primary key,            -- short random id used in /r/<id>
  risk_level    text not null check (risk_level in ('safe', 'suspicious', 'likely_scam')),
  confidence    int  not null default 0,
  detected_type text,
  summary       text not null,
  created_at    timestamptz not null default now()
);

-- Read by the server (service role) for the share page + OG image.
alter table public.shared_verdicts enable row level security;
