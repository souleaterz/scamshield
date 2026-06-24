import { NextResponse } from "next/server";
import { submitCommunityReport } from "@/app/lib/communityReports";

export const runtime = "nodejs";
export const maxDuration = 60;

// FTC Do Not Call reported-calls API (US). Runs on api.data.gov — DEMO_KEY works
// for low volume, but set FTC_API_KEY (free at api.data.gov/signup) for headroom.
const API_BASE = "https://api.ftc.gov/v0/dnc-complaints";

// Non-robocall complaints with these subjects are mostly unwanted-but-legitimate
// telemarketing or noise — skip them so we don't flag real businesses as scams.
// (Robocalls are ingested regardless of subject; an illegal robocall is signal.)
const NOISE_SUBJECTS = new Set([
  "",
  "Other",
  "No Subject Provided",
  "Dropped call or no message",
]);

interface DncAttributes {
  "company-phone-number"?: string;
  "recorded-message-or-robocall"?: string;
  subject?: string;
}

async function fetchPage(
  apiKey: string,
  page: number,
): Promise<DncAttributes[] | null> {
  const url = new URL(API_BASE);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("items_per_page", "50"); // API caps page size at 50
  url.searchParams.set("page_number", String(page));
  url.searchParams.set("sort_by", "created-date");
  url.searchParams.set("sort_order", "desc"); // newest complaints first

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Guardurai/1.0 (scam-protection-tool)" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { data?: { attributes?: DncAttributes }[] };
  return (json.data ?? []).map((d) => d.attributes ?? {});
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FTC_API_KEY || "DEMO_KEY";
  const searchParams = new URL(request.url).searchParams;
  // 50 complaints/page; bound the work to stay within the function timeout.
  const pages = Math.min(parseInt(searchParams.get("pages") ?? "10", 10), 20);

  // Collect unique, validated scam numbers. Track whether any occurrence was a
  // robocall so the report label reflects the strongest signal seen.
  const numbers = new Map<string, { robocall: boolean }>();
  let complaintsScanned = 0;
  let pagesFetched = 0;

  for (let page = 1; page <= pages; page++) {
    const rows = await fetchPage(apiKey, page);
    if (!rows) break; // rate-limited or upstream error — stop, keep what we have
    if (rows.length === 0) break;
    pagesFetched++;
    complaintsScanned += rows.length;

    for (const a of rows) {
      const raw = String(a["company-phone-number"] ?? "");
      // The feed contains garbage rows (dates, text). Require a real 10-digit US
      // number — strip nothing, just validate exactly 10 digits.
      if (!/^\d{10}$/.test(raw)) continue;

      const robocall = a["recorded-message-or-robocall"] === "Y";
      const subject = (a.subject ?? "").trim();
      // Quality gate: keep robocalls, plus complaints with a real scam subject.
      if (!robocall && NOISE_SUBJECTS.has(subject)) continue;

      const e164 = `+1${raw}`;
      const existing = numbers.get(e164);
      if (existing) {
        existing.robocall ||= robocall;
      } else {
        numbers.set(e164, { robocall });
      }
    }
  }

  // Upsert in bounded-concurrency batches (not 500 sequential awaits) so we
  // never blow the 60s budget and silently stop landing data.
  const entries = [...numbers.entries()];
  const BATCH = 20;
  let upserted = 0;
  let failed = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      slice.map(([e164, info]) =>
        submitCommunityReport(
          [{ inputType: "phone", inputValue: e164 }],
          "ftc",
          info.robocall ? "FTC Do Not Call (robocall)" : "FTC Do Not Call",
        ),
      ),
    );
    for (const r of results) r.status === "fulfilled" ? upserted++ : failed++;
  }

  return NextResponse.json({
    ok: failed === 0,
    pagesFetched,
    complaintsScanned,
    uniqueNumbers: entries.length,
    reportsUpserted: upserted,
    reportsFailed: failed,
  });
}
