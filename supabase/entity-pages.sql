-- Entity pages: auto-generated report pages for domains, phones, and companies.
-- Run this in the Supabase SQL Editor after schema.sql.

create table if not exists public.entity_pages (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('domain', 'phone', 'company')),
  slug            text not null,        -- URL-safe unique key per type (domain, phone digits, CH number)
  display_name    text not null,        -- Human-readable: "suspicious.com", "+44 7911...", "Acme Ltd"
  risk_level      text check (risk_level in ('safe', 'suspicious', 'likely_scam')),
  check_count     int  not null default 1,
  latest_verdict  jsonb,               -- Full Verdict or CompanyCheckResult JSON
  created_at      timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  constraint entity_pages_unique unique (entity_type, slug)
);

create index if not exists entity_pages_lookup_idx
  on public.entity_pages (entity_type, slug);

-- Partial index for the live feed query (only risky rows).
create index if not exists entity_pages_feed_idx
  on public.entity_pages (last_checked_at desc)
  where risk_level in ('likely_scam', 'suspicious');

alter table public.entity_pages enable row level security;


-- Atomically insert or increment check_count.
create or replace function public.upsert_entity_page(
  p_type         text,
  p_slug         text,
  p_display_name text,
  p_risk_level   text,
  p_verdict      jsonb
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.entity_pages (entity_type, slug, display_name, risk_level, latest_verdict)
  values (p_type, p_slug, p_display_name, p_risk_level, p_verdict)
  on conflict on constraint entity_pages_unique
  do update set
    display_name    = p_display_name,
    risk_level      = p_risk_level,
    latest_verdict  = p_verdict,
    check_count     = entity_pages.check_count + 1,
    last_checked_at = now()
  returning id into v_id;
  return v_id;
end;
$$;


-- Flag an entity page as a scam (created by user disagreeing with AI verdict).
-- Inserts if new, or upgrades risk level without overwriting the AI verdict.
create or replace function public.flag_entity_page(
  p_type         text,
  p_slug         text,
  p_display_name text
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.entity_pages (entity_type, slug, display_name, risk_level, latest_verdict)
  values (
    p_type,
    p_slug,
    p_display_name,
    'likely_scam',
    '{"source":"user_flag","summary":"Flagged as a scam by Guardurai users","risk_level":"likely_scam","red_flags":[],"advice":["Do not engage with this number or website","Report to Action Fraud (UK) at actionfraud.police.uk"]}'::jsonb
  )
  on conflict on constraint entity_pages_unique
  do update set
    risk_level      = case
                        when entity_pages.risk_level in ('safe', 'suspicious') then 'likely_scam'
                        else entity_pages.risk_level
                      end,
    check_count     = entity_pages.check_count + 1,
    last_checked_at = now()
  returning id into v_id;
  return v_id;
end;
$$;


-- Community comments / experience reports on entity pages.
create table if not exists public.entity_comments (
  id            uuid primary key default gen_random_uuid(),
  entity_id     uuid not null references public.entity_pages(id) on delete cascade,
  user_id       text,                  -- Clerk user ID, null for anonymous
  author_name   text,                  -- display name (optional)
  body          text not null check (char_length(body) between 10 and 500),
  commenter_ip  text,                  -- for rate limiting
  is_flagged    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists entity_comments_entity_idx
  on public.entity_comments (entity_id, created_at desc);

create index if not exists entity_comments_ip_idx
  on public.entity_comments (commenter_ip, created_at desc);

alter table public.entity_comments enable row level security;
