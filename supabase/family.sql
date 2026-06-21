-- Family plan: guardian ↔ protected-member links, alert settings, and an
-- alert-dedup ledger so a guardian can't be spammed.
--
-- Run this in the Supabase SQL editor (safe to re-run).

-- Who a guardian protects. One row per invited member.
create table if not exists public.family_members (
  id               uuid primary key default gen_random_uuid(),
  guardian_user_id text not null,
  member_user_id   text,                       -- null until the invite is accepted
  member_label     text not null,              -- e.g. "Mum", "Dad", "Grandad"
  invite_code      text not null unique,
  status           text not null default 'pending'
                     check (status in ('pending', 'active', 'revoked')),
  created_at       timestamptz not null default now(),
  accepted_at      timestamptz
);

create index if not exists family_members_guardian_idx
  on public.family_members (guardian_user_id);

create unique index if not exists family_members_member_active_idx
  on public.family_members (member_user_id)
  where member_user_id is not null and status = 'active';

-- Where a guardian's alerts are sent.
create table if not exists public.family_settings (
  guardian_user_id text primary key,
  alert_email      text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Dedup ledger: one alert per (member, dedup_key) — dedup_key embeds the date,
-- so the same scam can re-alert on a later day but not repeatedly the same day.
create table if not exists public.guardian_alerts (
  id              uuid primary key default gen_random_uuid(),
  member_user_id  text not null,
  dedup_key       text not null,
  created_at      timestamptz not null default now(),
  unique (member_user_id, dedup_key)
);
