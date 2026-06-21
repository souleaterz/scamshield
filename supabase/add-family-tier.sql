-- Allow the 'family' tier on existing deployments.
-- The original subscriptions.tier check only permitted 'free' | 'pro', which
-- silently blocked Family upgrades (the webhook upsert failed the constraint).
--
-- Run this once in the Supabase SQL editor.

alter table public.subscriptions
  drop constraint if exists subscriptions_tier_check;

alter table public.subscriptions
  add constraint subscriptions_tier_check
  check (tier in ('free', 'pro', 'family'));
