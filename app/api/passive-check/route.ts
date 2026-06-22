import { NextResponse, after } from "next/server";
import { checkUrlsInText } from "@/app/lib/urlReputation";
import { lookupCommunityReports } from "@/app/lib/communityReports";
import { getUserId } from "@/app/lib/auth";
import { notifyGuardianOfScam, recordExtensionActivity } from "@/app/lib/family";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ riskLevel: "safe" });
  }

  const { url } = (body ?? {}) as { url?: unknown };
  if (typeof url !== "string" || !url.startsWith("http")) {
    return NextResponse.json({ riskLevel: "safe" });
  }

  // Real-time protection is free for everyone — it's cheap to run (DB lookup +
  // Safe Browsing, no Claude/RDAP) and keeping people safe drives trust + growth.
  // The paid line is the deep AI analysis in /api/analyze, not this passive check.

  // A signed-in user calling this = their extension is active. Record a
  // heartbeat (non-blocking) so the Family dashboard can show protection status.
  const userId = await getUserId();
  if (userId) after(() => void recordExtensionActivity(userId));

  // Hard-signal checks only — no Claude, no RDAP. Target latency < 600ms.
  const [urlChecks, communityMatches] = await Promise.all([
    checkUrlsInText(url, { skipRdap: true }),
    lookupCommunityReports(url),
  ]);

  type Risk = "safe" | "suspicious" | "likely_scam";
  const flags: string[] = [];
  let riskLevel: Risk = "safe";

  // Community database matches are the strongest signal.
  for (const m of communityMatches) {
    riskLevel = "likely_scam";
    const who =
      m.source === "fca"
        ? "FCA Warning List"
        : m.source === "urlhaus"
          ? "URLhaus malware database"
          : `${m.reportCount} Guardurai user report${m.reportCount !== 1 ? "s" : ""}`;
    flags.push(`Flagged by ${who}`);
  }

  for (const check of urlChecks) {
    if (check.safeBrowsingThreats?.length) {
      riskLevel = "likely_scam";
      for (const t of check.safeBrowsingThreats) {
        flags.push(`Google Safe Browsing: ${t.replace(/_/g, " ").toLowerCase()}`);
      }
    }
    if (check.flags.length > 0) {
      if (riskLevel === "safe") riskLevel = "suspicious";
      flags.push(...check.flags);
    }
  }

  // If a signed-in family member lands on a known scam site, alert their
  // guardian. Only runs on the rare likely_scam case, so it adds no latency to
  // normal browsing; the email send is deduped (per member/domain/day).
  if (riskLevel === "likely_scam") {
    if (userId) {
      let host = url;
      try {
        host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        /* keep raw url */
      }
      const summary = `Visited ${host} — ${flags[0] ?? "a known scam site"}.`;
      after(() =>
        void notifyGuardianOfScam(userId, {
          summary,
          detectedType: "Website visit",
          dedupKey: host,
        }),
      );
    }
  }

  const finalRisk: Risk = riskLevel;
  return NextResponse.json({ riskLevel: finalRisk, flags, communityMatches });
}
