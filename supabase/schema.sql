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
  tier                   text not null default 'free' -- 'free' | 'pro' | 'family'
                           check (tier in ('free', 'pro', 'family')),
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


-- Community scam reports: user-submitted + seeded from FCA warning list / URLhaus.
-- Keyed on (input_type, input_value) — one row per unique identifier, with an
-- incrementing report_count so each new reporter bumps the number.
create table if not exists public.scam_reports (
  id               uuid primary key default gen_random_uuid(),
  input_type       text not null check (input_type in ('domain', 'phone', 'email')),
  input_value      text not null,        -- normalised: domain without www, E.164 phone
  report_count     int  not null default 1,
  source           text not null default 'user'
                     check (source in ('user', 'fca', 'urlhaus', 'reddit')),
  source_label     text,                 -- e.g. "FCA Warning List: XYZ Capital Ltd"
  first_reported_at timestamptz not null default now(),
  last_reported_at  timestamptz not null default now(),
  constraint scam_reports_unique unique (input_type, input_value)
);

create index if not exists scam_reports_lookup_idx
  on public.scam_reports (input_type, input_value);

alter table public.scam_reports enable row level security;

-- Atomically insert or increment a community report.
create or replace function public.increment_scam_report(
  p_input_type  text,
  p_input_value text,
  p_source      text    default 'user',
  p_label       text    default null
) returns void language plpgsql security definer as $$
begin
  insert into public.scam_reports (input_type, input_value, report_count, source, source_label)
  values (p_input_type, p_input_value, 1, p_source, p_label)
  on conflict on constraint scam_reports_unique
  do update set
    report_count     = scam_reports.report_count + 1,
    last_reported_at = now();
end;
$$;
