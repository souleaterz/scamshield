import { NextResponse } from "next/server";
import { submitCommunityReport } from "@/app/lib/communityReports";
import { upsertEntityPageFromFeed, domainToSlug } from "@/app/lib/entityPages";

export const runtime = "nodejs";
export const maxDuration = 60;

const FEED_URL = "https://urlhaus.abuse.ch/downloads/csv_online/";

// Hosts that are infrastructure / not worth their own scam page.
const SKIP_DOMAINS = new Set([
  "pastebin.com", "raw.githubusercontent.com", "github.com",
  "drive.google.com", "docs.google.com", "googleusercontent.com",
  "discord.com", "cdn.discordapp.com", "t.me",
  "bit.ly", "tinyurl.com",
]);

function isIpHost(host: string): boolean {
  // IPv4, or bracketed/colon IPv6 — these make poor "is X a scam" pages.
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.includes(":") ||
    host.startsWith("[")
  );
}

/** Parse one URLhaus CSV row — every field is double-quoted. */
function parseRow(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

function hostFromUrl(raw: string): string | null {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".") || isIpHost(host) || SKIP_DOMAINS.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  // Bound the work per run so we stay within the function timeout.
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "150", 10), 500);

  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": "Guardurai/1.0 (scam-protection-tool)" },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `URLhaus feed returned ${res.status}` },
      { status: 502 },
    );
  }

  const csv = await res.text();
  const lines = csv.split("\n");

  // Newest rows are at the top of csv_online; collect unique domains up to limit.
  const domains: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const fields = parseRow(line);
    if (fields.length < 3) continue;
    const host = hostFromUrl(fields[2]);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    domains.push(host);
    if (domains.length >= limit) break;
  }

  let created = 0;
  for (const domain of domains) {
    const [entityId] = await Promise.all([
      upsertEntityPageFromFeed("domain", domainToSlug(domain), domain, "likely_scam", {
        source: "urlhaus",
        sourceLabel: "URLhaus (abuse.ch)",
        summary: `Listed on URLhaus (abuse.ch) as an active malware or phishing host.`,
        redFlags: ["Flagged by the URLhaus threat database as actively malicious"],
      }),
      submitCommunityReport(
        [{ inputType: "domain", inputValue: domain }],
        "urlhaus",
        "URLhaus (abuse.ch)",
      ),
    ]);
    if (entityId) created++;
  }

  return NextResponse.json({
    ok: true,
    domainsScanned: seen.size,
    pagesUpserted: created,
  });
}
