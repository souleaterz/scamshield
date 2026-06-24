-- Gift-month redemption codes (sold on eBay etc).
-- Each code is single-use: redeeming grants the user `duration_days` of Pro or
-- Family access with NO card and NO auto-charge. Access lapses back to Free
-- when it expires. Run in the Supabase SQL Editor.

create table if not exists public.redemption_codes (
  code          text primary key,
  tier          text not null check (tier in ('pro', 'family')),
  duration_days int  not null default 30,
  batch         text,                 -- label for tracking, e.g. 'ebay-2026-06'
  status        text not null default 'unused' check (status in ('unused', 'redeemed')),
  redeemed_by   text,                 -- Clerk user id
  redeemed_email text,                -- captured for Resend reminders
  redeemed_at   timestamptz,
  reminded_at   timestamptz,          -- set when the expiry reminder was sent
  created_at    timestamptz not null default now()
);

-- Fast lookup of a user's active grants when resolving their tier.
create index if not exists redemption_codes_redeemed_by_idx
  on public.redemption_codes (redeemed_by) where status = 'redeemed';

alter table public.redemption_codes enable row level security;
-- No public policies: only the server (service-role key) reads/writes these.
