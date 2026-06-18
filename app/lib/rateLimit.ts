import { getSupabaseAdmin } from "@/app/lib/supabase";
import type { RiskLevel, Tier } from "@/app/lib/scamAnalysis";

/** Daily check allowance per identifier, by tier. Infinity = unmetered. */
export const DAILY_LIMITS: Record<Tier, number> = {
  free: 1,
  pro: 200,
  unlimited: Infinity,
};

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** False when Supabase isn't configured yet (we fail open). */
  enforced: boolean;
}

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Count today's checks for this identifier and decide whether another is
 * allowed. Fails open (allows the check) when Supabase is unconfigured or
 * errors — we'd rather let a scam check through than block a worried user.
 */
export async function checkRateLimit(
  identifier: string,
  tier: Tier,
): Promise<RateLimitResult> {
  const limit = DAILY_LIMITS[tier];

  // Unmetered tiers never need a count.
  if (!Number.isFinite(limit)) {
    return { allowed: true, used: 0, limit, remaining: limit, enforced: true };
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { allowed: true, used: 0, limit, remaining: limit, enforced: false };
  }

  const { count, error } = await supabase
    .from("usage_checks")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("created_at", startOfUtcDay());

  if (error) {
    console.error("Rate-limit count failed, failing open:", error.message);
    return { allowed: true, used: 0, limit, remaining: limit, enforced: false };
  }

  const used = count ?? 0;
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    enforced: true,
  };
}

export interface RecordCheckParams {
  identifier: string;
  identifierType: "ip" | "user";
  tier: Tier;
  riskLevel: RiskLevel;
  detectedType: string;
  summary: string;
}

/**
 * Persist a completed check for rate limiting + future history. Best-effort:
 * a failure here is logged but never blocks the verdict response.
 */
export async function recordCheck(params: RecordCheckParams): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("usage_checks").insert({
    identifier: params.identifier,
    identifier_type: params.identifierType,
    tier: params.tier,
    risk_level: params.riskLevel,
    detected_type: params.detectedType,
    summary: params.summary,
  });

  if (error) {
    console.error("Failed to record check:", error.message);
  }
}
