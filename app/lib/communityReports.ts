import { getSupabaseAdmin } from "@/app/lib/supabase";
import { extractUrls } from "@/app/lib/urlReputation";
import { findNumbers } from "libphonenumber-js";
import type { CommunityMatch } from "@/app/lib/scamAnalysis";

function normalizeDomain(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function extractIdentifiers(text: string): { type: "domain" | "phone"; value: string }[] {
  const items: { type: "domain" | "phone"; value: string }[] = [];

  const urls = extractUrls(text).slice(0, 3);
  const domains = [...new Set(urls.map(normalizeDomain))];
  for (const d of domains) items.push({ type: "domain", value: d });

  const phones = findNumbers(text, { defaultCountry: "GB", v2: true }).slice(0, 2);
  for (const { number } of phones) items.push({ type: "phone", value: number.format("E.164") });

  return items;
}

/** Look up any community reports for domains/phones found in the text. */
export async function lookupCommunityReports(text: string): Promise<CommunityMatch[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const ids = extractIdentifiers(text);
  if (ids.length === 0) return [];

  const values = ids.map((i) => i.value);

  const { data, error } = await supabase
    .from("scam_reports")
    .select("input_type, input_value, report_count, source, source_label, last_reported_at")
    .in("input_value", values)
    .order("report_count", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    inputType: r.input_type as "domain" | "phone" | "email",
    inputValue: r.input_value as string,
    reportCount: r.report_count as number,
    source: r.source as string,
    sourceLabel: r.source_label as string | null,
    lastReported: r.last_reported_at as string,
  }));
}

/** Submit one or more identifiers as community scam reports. */
export async function submitCommunityReport(
  items: { inputType: "domain" | "phone"; inputValue: string }[],
  source: "user" | "fca" | "urlhaus" = "user",
  label?: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase || items.length === 0) return;

  await Promise.all(
    items.map((item) =>
      supabase.rpc("increment_scam_report", {
        p_input_type: item.inputType,
        p_input_value: item.inputValue,
        p_source: source,
        p_label: label ?? null,
      }),
    ),
  );
}

/** Extract reportable identifiers from a verdict's link/phone checks. */
export function extractReportItems(
  linkChecks: { host: string }[],
  phoneChecks: { e164: string }[],
): { inputType: "domain" | "phone"; inputValue: string }[] {
  const items: { inputType: "domain" | "phone"; inputValue: string }[] = [];
  for (const c of linkChecks) items.push({ inputType: "domain", inputValue: c.host });
  for (const c of phoneChecks) items.push({ inputType: "phone", inputValue: c.e164 });
  return items;
}

/** Compact summary for the Claude prompt. */
export function describeCommunityReports(matches: CommunityMatch[]): string {
  if (matches.length === 0) return "";
  const lines = matches.map((m) => {
    const who =
      m.source === "fca"
        ? `FCA Warning List (${m.sourceLabel ?? "unauthorized firm"})`
        : m.source === "urlhaus"
          ? "URLhaus malware/phishing database"
          : `${m.reportCount} ScamShield user report${m.reportCount !== 1 ? "s" : ""}`;
    return `- ${m.inputValue} (${m.inputType}): flagged by ${who}`;
  });
  return `Community scam database matches — treat these as STRONG evidence of fraud:\n${lines.join("\n")}`;
}
