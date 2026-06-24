-- Capture the redeemer's email (from Clerk) on the code row, so a reminder job
-- can email "your month is ending" without re-querying Clerk for everyone.
-- reminded_at lets that job dedupe. Run in the Supabase SQL Editor.

alter table public.redemption_codes
  add column if not exists redeemed_email text,
  add column if not exists reminded_at    timestamptz;
