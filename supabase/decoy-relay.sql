-- Decoy relay: route the scammer conversation through a Guardurai mailbox so we
-- can (a) capture transcripts, (b) measure real "time wasted" from message
-- timestamps, and (c) keep the user's real inbox out of it.
-- Run in the Supabase SQL editor (safe to re-run).

-- Extend the existing decoy_sessions with relay/conversation fields.
alter table public.decoy_sessions
  add column if not exists relay_address  text,   -- unique inbox for this decoy, e.g. sarah.smith.7f3a@decoy.guardurai.com
  add column if not exists scammer_email  text,   -- where the opener was sent
  add column if not exists first_reply_at timestamptz, -- first scammer reply (engagement start)
  add column if not exists last_message_at timestamptz, -- most recent message either way
  add column if not exists message_count  integer not null default 0;

-- Look up a session by its relay address when an inbound email arrives.
create unique index if not exists decoy_sessions_relay_idx
  on public.decoy_sessions (relay_address)
  where relay_address is not null;

-- Every message in a decoy conversation, both directions.
create table if not exists public.decoy_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.decoy_sessions (id) on delete cascade,
  direction   text not null check (direction in ('inbound', 'outbound')),
  from_addr   text,
  to_addr     text,
  subject     text,
  body        text,
  created_at  timestamptz not null default now()
);

-- Fetch a session's thread in order (transcript view).
create index if not exists decoy_messages_session_idx
  on public.decoy_messages (session_id, created_at);

-- RLS: server-side only via service-role key (same as every other table).
alter table public.decoy_messages enable row level security;
