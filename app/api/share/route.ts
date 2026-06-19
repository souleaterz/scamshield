import { NextResponse } from "next/server";
import { createSharedVerdict } from "@/app/lib/share";
import { SITE_URL } from "@/app/lib/site";
import type { RiskLevel } from "@/app/lib/scamAnalysis";

export const runtime = "nodejs";

const RISK_LEVELS: RiskLevel[] = ["safe", "suspicious", "likely_scam"];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { risk_level, confidence, detected_type, summary } = (body ?? {}) as {
    risk_level?: unknown;
    confidence?: unknown;
    detected_type?: unknown;
    summary?: unknown;
  };

  if (
    !RISK_LEVELS.includes(risk_level as RiskLevel) ||
    typeof summary !== "string" ||
    !summary.trim()
  ) {
    return NextResponse.json({ error: "Nothing to share." }, { status: 400 });
  }

  const id = await createSharedVerdict({
    risk_level: risk_level as RiskLevel,
    confidence: Number(confidence) || 0,
    detected_type: typeof detected_type === "string" ? detected_type : "",
    summary,
  });

  if (!id) {
    return NextResponse.json(
      { error: "Sharing isn't available right now." },
      { status: 503 },
    );
  }

  return NextResponse.json({ id, url: `${SITE_URL}/r/${id}` });
}
