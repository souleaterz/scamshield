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
