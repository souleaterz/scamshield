import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import type { RiskLevel, Verdict } from "@/app/lib/scamAnalysis";
import type { CompanyCheckResult } from "@/app/lib/companyCheck";

export type EntityType = "domain" | "phone" | "company";

export interface EntityPage {
  id: string;
  entity_type: EntityType;
  slug: string;
  display_name: string;
  risk_level: RiskLevel | null;
  check_count: number;
  latest_verdict: Record<string, unknown> | null;
  created_at: string;
  last_checked_at: string;
}

export interface EntityComment {
  id: string;
  entity_id: string;
  user_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

// ── Slug generation ──────────────────────────────────────────────────────────

export function domainToSlug(host: string): string {
  return host.toLowerCase().replace(/^www\./, "").trim();
}

export function phoneToSlug(e164: string): string {
  // "+447911123456" → "447911123456"
  return e164.replace(/^\+/, "");
}

export function companyToSlug(result: CompanyCheckResult): string {
  const chNum = result.companiesHouse.company?.companyNumber;
  const fcaFrn = result.fca.firm?.frn;
  if (chNum) return chNum.toLowerCase();
  if (fcaFrn) return `fca-${fcaFrn}`;
  return result.query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ── Writes ───────────────────────────────────────────────────────────────────

async function upsertEntityPage(
  type: EntityType,
  slug: string,
  displayName: string,
  riskLevel: RiskLevel | null,
  verdictData: unknown,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.rpc("upsert_entity_page", {
    p_type: type,
    p_slug: slug,
    p_display_name: displayName,
    p_risk_level: riskLevel ?? null,
    p_verdict: verdictData,
  });
  if (error) console.error("[entity] upsert failed:", error.message);
}

/** Called after /api/analyze returns. Fire-and-forget via next/server `after`. */
export async function upsertEntitiesFromVerdict(verdict: Verdict): Promise<void> {
  const tasks: Promise<void>[] = [];

  for (const check of verdict.link_checks ?? []) {
    tasks.push(
      upsertEntityPage("domain", domainToSlug(check.host), check.host, verdict.risk_level, verdict),
    );
  }
  for (const check of verdict.phone_checks ?? []) {
    tasks.push(
      upsertEntityPage("phone", phoneToSlug(check.e164), check.display, verdict.risk_level, verdict),
    );
  }

  await Promise.allSettled(tasks);
}

/** Called after /api/check-company returns. Fire-and-forget via next/server `after`. */
export async function upsertEntityFromCompany(
  result: CompanyCheckResult,
  riskLevel: RiskLevel,
): Promise<void> {
  const slug = companyToSlug(result);
  const displayName =
    result.companiesHouse.company?.name ??
    result.fca.firm?.name ??
    result.query;
  await upsertEntityPage("company", slug, displayName, riskLevel, result);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getEntityPage(
  type: string,
  slug: string,
): Promise<EntityPage | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  if (!["domain", "phone", "company"].includes(type)) return null;

  const { data, error } = await supabase
    .from("entity_pages")
    .select("*")
    .eq("entity_type", type)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as EntityPage;
}

export async function getCommentsForEntity(
  entityId: string,
): Promise<EntityComment[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("entity_comments")
    .select("id, entity_id, user_id, author_name, body, created_at")
    .eq("entity_id", entityId)
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (data ?? []) as EntityComment[];
}

/**
 * Look up how many times this entity has been flagged in scam_reports.
 * Phones: slug "447911123456" → look up E.164 "+447911123456".
 * Domains: slug is the bare domain.
 * Companies: not in scam_reports yet, returns 0.
 */
export async function getScamReportCount(
  type: EntityType,
  slug: string,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  let inputType: string;
  let inputValue: string;

  if (type === "phone") {
    inputType = "phone";
    inputValue = `+${slug}`;
  } else if (type === "domain") {
    inputType = "domain";
    inputValue = slug;
  } else {
    return 0;
  }

  const { data } = await supabase
    .from("scam_reports")
    .select("report_count")
    .eq("input_type", inputType)
    .eq("input_value", inputValue)
    .maybeSingle();

  return (data?.report_count as number | null) ?? 0;
}

async function _getRecentRiskyEntities(): Promise<EntityPage[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("entity_pages")
    .select("id, entity_type, slug, display_name, risk_level, check_count, last_checked_at")
    .in("risk_level", ["likely_scam", "suspicious"])
    .order("last_checked_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return (data ?? []) as EntityPage[];
}

/** Cached for 60 s — gives the homepage feed a live feel without hammering the DB. */
export const getRecentRiskyEntities = unstable_cache(
  _getRecentRiskyEntities,
  ["recent-risky-entities"],
  { revalidate: 60 },
);
