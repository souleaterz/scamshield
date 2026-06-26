-- Migration: add 'ai' as a valid source for community scam reports.
-- Lets an AI scam verdict (e.g. an email/text checked via /api/analyze) feed the
-- community database, so passive protection warns future visitors to that site.
-- Run in Supabase SQL Editor if you already ran schema.sql.

ALTER TABLE public.scam_reports
  DROP CONSTRAINT IF EXISTS scam_reports_source_check;

ALTER TABLE public.scam_reports
  ADD CONSTRAINT scam_reports_source_check
  CHECK (source IN ('user', 'fca', 'urlhaus', 'reddit', 'ftc', 'ai'));
