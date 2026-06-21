import { NextResponse } from "next/server";
import { after } from "next/server";
import { getUserId, getClientIp } from "@/app/lib/auth";
import { checkRateLimit, recordCheck } from "@/app/lib/rateLimit";
import { getTierForUser } from "@/app/lib/subscription";
import { checkCompany } from "@/app/lib/companyCheck";
import type { RiskLevel, Tier } from "@/app/lib/scamAnalysis";
import { upsertEntityFromCompany } from "@/app/lib/entityPages";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { query } = (body ?? {}) as { query?: unknown };
  const trimmedQuery = typeof query === "string" ? query.trim() : "";

  if (!trimmedQuery) {
    return NextResponse.json({ error: "Provide a company name, number, or FCA FRN to check." }, { status: 400 });
  }

  if (trimmedQuery.length > 200) {
    return NextResponse.json({ error: "Query is too long." }, { status: 400 });
  }

  try {
    const userId = await getUserId();
    const ip = getClientIp(request);
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const identifierType: "ip" | "user" = userId ? "user" : "ip";
    const tier: Tier = await getTierForUser(userId);

    // Company & FCA checks are a paid feature.
    if (tier === "free") {
      return NextResponse.json(
        { error: "Company & FCA checks are a Pro feature.", requiresUpgrade: true },
        { status: 403 },
      );
    }

    const limit = await checkRateLimit(identifier, tier);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You've used your free check for today.", limitReached: true, limit: limit.limit, used: limit.used },
        { status: 429 },
      );
    }

    const result = await checkCompany(trimmedQuery);

    const riskMap: Record<string, RiskLevel> = {
      legitimate: "safe",
      suspicious: "suspicious",
      likely_fraudulent: "likely_scam",
    };

    const companyName = result.companiesHouse.company?.name ?? result.fca.firm?.name ?? trimmedQuery;
    const summary =
      result.verdict === "legitimate"
        ? `${companyName} appears to be a legitimate registered company.`
        : result.verdict === "suspicious"
          ? `${companyName} has raised some concerns — check the details carefully.`
          : `${companyName} could not be verified as a legitimate UK company.`;

    await recordCheck({
      identifier,
      identifierType,
      tier,
      riskLevel: riskMap[result.verdict] ?? "suspicious",
      detectedType: "business check",
      summary,
    });

    const riskLevel: RiskLevel = riskMap[result.verdict] ?? "suspicious";
    after(() => void upsertEntityFromCompany(result, riskLevel));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Unexpected error in check-company:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
