-- Global protection stats: a tiny key/value counter aggregated across every
-- Guardurai user, shown live on the homepage.
-- Run in the Supabase SQL editor (safe to re-run).

create table if not exists public.global_stats (
  key        text primary key,
  value      bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.global_stats (key, value) values
  ('pages_protected', 0),
  ('threats_blocked', 0)
on conflict (key) do nothing;

-- Atomic increment so concurrent extension syncs can't clobber each other.
create or replace function public.increment_global_stats(p_pages bigint, p_threats bigint)
returns void
language sql
as $$
  update public.global_stats set value = value + p_pages,   updated_at = now() where key = 'pages_protected';
  update public.global_stats set value = value + p_threats, updated_at = now() where key = 'threats_blocked';
$$;

-- RLS: server-side only via service-role key (same as every other table).
alter table public.global_stats enable row level security;
