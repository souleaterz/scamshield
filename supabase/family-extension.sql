-- Tracks when each signed-in user last had the browser extension active
-- (the extension calls /api/passive-check with the user's auth cookie as they
-- browse). Used on the Family dashboard to show whether a protected member has
-- real-time protection enabled.
--
-- Run once in the Supabase SQL editor.

create table if not exists public.extension_activity (
  user_id   text primary key,
  last_seen timestamptz not null default now()
);
