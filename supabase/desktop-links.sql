-- Device-pairing for the Guardurai desktop app.
--
-- The desktop app can't run a browser sign-in, so it pairs like a smart TV:
--   1. App calls /api/desktop/link/start  -> gets a short CODE + secret TOKEN
--   2. User visits guardurai.com/link (signed in) and types the CODE
--   3. /api/desktop/link/claim ties their Clerk user_id to that row
--   4. App polls /api/desktop/link/status?token=... and learns it's linked
--
-- The TOKEN is the long-lived secret the app stores locally and sends on each
-- API call (header: x-guardurai-device) so checks run at the user's paid tier.
--
-- Run once in the Supabase SQL editor.

create table if not exists public.desktop_links (
  token       text primary key,            -- secret stored by the app
  code        text not null,               -- short human-typed pairing code
  user_id     text,                        -- Clerk id, set on claim
  status      text not null default 'pending', -- 'pending' | 'linked'
  created_at  timestamptz not null default now(),
  linked_at   timestamptz
);

-- Codes are looked up case-insensitively while still pending.
create unique index if not exists desktop_links_code_pending
  on public.desktop_links (upper(code))
  where status = 'pending';

create index if not exists desktop_links_user on public.desktop_links (user_id);
