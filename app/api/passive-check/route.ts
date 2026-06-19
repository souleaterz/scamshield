import { NextResponse } from "next/server";
import { checkUrlsInText } from "@/app/lib/urlReputation";
import { lookupCommunityReports } from "@/app/lib/communityReports";

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

  // Hard-signal checks only — no Claude, no RDAP. Target latency < 600ms.
  const [urlChecks, communityMatches] = await Promise.all([
    checkUrlsInText(url, { skipRdap: true }),
    lookupCommunityReports(url),
  ]);

  const flags: string[] = [];
  let riskLevel: "safe" | "suspicious" | "likely_scam" = "safe";

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

  return NextResponse.json({ riskLevel, flags, communityMatches });
}
