-- Migration: flag_entity_page RPC.
-- Inserts a new entity page or upgrades its risk level without overwriting
-- the existing AI verdict. Run after entity-pages.sql.

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
    -- Only upgrade risk, never downgrade existing AI verdicts
    risk_level      = case
                        when entity_pages.risk_level in ('safe', 'suspicious') then 'likely_scam'
                        else entity_pages.risk_level
                      end,
    -- Keep existing latest_verdict (don't overwrite the AI analysis)
    check_count     = entity_pages.check_count + 1,
    last_checked_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
