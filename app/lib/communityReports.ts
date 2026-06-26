import { getSupabaseAdmin } from "@/app/lib/supabase";
import { extractUrls } from "@/app/lib/urlReputation";
import { findNumbers } from "libphonenumber-js";
import type { CommunityMatch, Verdict } from "@/app/lib/scamAnalysis";

// Major legitimate brands that scam emails commonly *impersonate*. We never
// auto-flag these from an AI verdict — a phishing email mentioning a real
// paypal.com / amazon.co.uk link must not poison the community DB and start
// warning users away from the genuine site.
const AUTO_REPORT_SAFE_DOMAINS = new Set([
  "google.com", "youtube.com", "gmail.com", "googlemail.com",
  "facebook.com", "instagram.com", "whatsapp.com", "messenger.com",
  "twitter.com", "x.com", "linkedin.com", "reddit.com", "tiktok.com",
  "amazon.com", "amazon.co.uk", "ebay.com", "ebay.co.uk",
  "apple.com", "icloud.com", "microsoft.com", "outlook.com", "hotmail.com",
  "live.com", "office.com", "paypal.com", "stripe.com",
  "netflix.com", "spotify.com", "bbc.co.uk", "royalmail.com",
  "gov.uk", "hmrc.gov.uk", "nhs.uk",
]);

function normalizeHost(host: string): string {
  return host.replace(/^www\./, "").toLowerCase().trim();
}

function isSafeAutoReportDomain(host: string): boolean {
  const h = normalizeHost(host);
  if (AUTO_REPORT_SAFE_DOMAINS.has(h)) return true;
  if (h.endsWith(".gov.uk") || h.endsWith(".nhs.uk")) return true;
  // match subdomains of any safe base, e.g. mail.google.com → google.com
  for (const safe of AUTO_REPORT_SAFE_DOMAINS) {
    if (h.endsWith(`.${safe}`)) return true;
  }
  return false;
}

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

  const seen = new Set<string>();
  for (const country of ["GB", "US", "CA", "AU", "IN", "NG", "ZA"] as const) {
    for (const { number } of findNumbers(text, { defaultCountry: country, v2: true })) {
      const e164 = number.format("E.164");
      if (!seen.has(e164)) { seen.add(e164); items.push({ type: "phone", value: e164 }); }
    }
  }

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
  source: "user" | "fca" | "urlhaus" | "reddit" | "ftc" | "ai" = "user",
  label?: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase || items.length === 0) return;

  const results = await Promise.all(
    items.map((item) =>
      supabase.rpc("increment_scam_report", {
        p_input_type: item.inputType,
        p_input_value: item.inputValue,
        p_source: source,
        p_label: label ?? null,
      }),
    ),
  );

  // supabase-js resolves (never rejects) on a DB error — surface it so callers
  // don't count a swallowed failure as a successful write.
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) {
    throw new Error(`increment_scam_report failed: ${firstError.message}`);
  }
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

/**
 * Auto-feed a scam verdict into the community database so passive protection
 * warns future visitors. Only runs for likely_scam, skips impersonated big
 * brands, and tags the rows with source "ai". Best-effort — logs and moves on.
 */
export async function autoReportScamFromVerdict(verdict: Verdict): Promise<void> {
  if (verdict.risk_level !== "likely_scam") return;

  const domainItems = (verdict.link_checks ?? [])
    .map((c) => normalizeHost(c.host))
    .filter((h) => h && !isSafeAutoReportDomain(h))
    .map((h) => ({ inputType: "domain" as const, inputValue: h }));

  const phoneItems = (verdict.phone_checks ?? [])
    .filter((c) => c.valid && c.e164)
    .map((c) => ({ inputType: "phone" as const, inputValue: c.e164 }));

  // Dedup by value.
  const seen = new Set<string>();
  const items = [...domainItems, ...phoneItems].filter((i) => {
    if (seen.has(i.inputValue)) return false;
    seen.add(i.inputValue);
    return true;
  });

  if (items.length === 0) return;

  try {
    await submitCommunityReport(items, "ai", "Guardurai AI analysis");
  } catch (err) {
    console.error("[community] auto-report failed:", err);
  }
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
          : m.source === "reddit"
            ? `Reddit r/ScamNumbers (${m.reportCount} post${m.reportCount !== 1 ? "s" : ""})`
            : m.source === "ftc"
              ? `FTC Do Not Call registry (${m.reportCount} unwanted-call/robocall complaint${m.reportCount !== 1 ? "s" : ""})`
              : m.source === "ai"
                ? "Guardurai AI analysis (previously detected as a scam)"
                : `${m.reportCount} Guardurai user report${m.reportCount !== 1 ? "s" : ""}`;
    return `- ${m.inputValue} (${m.inputType}): flagged by ${who}`;
  });
  return `Community scam database matches — treat these as STRONG evidence of fraud:\n${lines.join("\n")}`;
}

/** Report count threshold → risk override. Returns null if count is too low to matter. */
export function communityRiskLevel(
  reportCount: number,
): "likely_scam" | "suspicious" | null {
  if (reportCount >= 10) return "likely_scam";
  if (reportCount >= 3) return "suspicious";
  return null;
}
