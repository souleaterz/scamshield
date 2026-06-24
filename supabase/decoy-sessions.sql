-- Decoy feature: tracks deployed fake personas and wasted scammer time.
-- Run this in the Supabase SQL editor (safe to re-run).

create table if not exists public.decoy_sessions (
  id                   uuid primary key default gen_random_uuid(),
  -- Who deployed the decoy
  identifier           text not null,            -- "user:<clerk_id>" or "ip:<addr>"
  identifier_type      text not null default 'ip'
                         check (identifier_type in ('ip', 'user')),
  user_id              text,                     -- null for anonymous deploys
  -- The fake persona (full JSON blob)
  persona              jsonb not null,
  -- The generated opening reply shown to the user
  initial_reply        text,
  -- Lifecycle
  status               text not null default 'active'
                         check (status in ('active', 'closed')),
  started_at           timestamptz not null default now(),
  last_activity_at     timestamptz not null default now(),
  -- Cumulative seconds of scammer engagement tracked client-side
  time_wasted_seconds  integer not null default 0
);

-- Rate-limit lookups: count today's sessions per identifier
create index if not exists decoy_sessions_identifier_started_idx
  on public.decoy_sessions (identifier, started_at desc);

-- Global stats query: sum time wasted across all active sessions
create index if not exists decoy_sessions_status_idx
  on public.decoy_sessions (status);

-- RLS: server-side only via service-role key (same pattern as all other tables)
alter table public.decoy_sessions enable row level security;
