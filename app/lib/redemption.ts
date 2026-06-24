import { getSupabaseAdmin } from "@/app/lib/supabase";

type GrantTier = "pro" | "family";

export type RedeemResult =
  | { ok: true; tier: GrantTier; expiresAt: string }
  | { ok: false; error: "invalid" | "used" | "unavailable" };

const DAY_MS = 86_400_000;

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * The best currently-active gift tier for a user (family beats pro), or null.
 * A grant is active for `duration_days` after it was redeemed.
 */
export async function getActiveGrantTier(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
): Promise<GrantTier | null> {
  const { data } = await supabase
    .from("redemption_codes")
    .select("tier, redeemed_at, duration_days")
    .eq("redeemed_by", userId)
    .eq("status", "redeemed");

  if (!data || data.length === 0) return null;

  const now = Date.now();
  const rank: Record<GrantTier, number> = { pro: 1, family: 2 };
  let best: GrantTier | null = null;

  for (const row of data) {
    const start = row.redeemed_at ? new Date(row.redeemed_at).getTime() : 0;
    const expires = start + (row.duration_days ?? 30) * DAY_MS;
    const tier = row.tier as GrantTier;
    if (expires > now && (tier === "pro" || tier === "family")) {
      if (!best || rank[tier] > rank[best]) best = tier;
    }
  }
  return best;
}

/**
 * Redeem a code for a signed-in user. Atomically flips the row from 'unused' to
 * 'redeemed' so a code can never be used twice, even under concurrent requests.
 */
export async function redeemCode(
  rawCode: string,
  userId: string,
): Promise<RedeemResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "unavailable" };

  const code = normalize(rawCode);

  const { data, error } = await supabase
    .from("redemption_codes")
    .update({
      status: "redeemed",
      redeemed_by: userId,
      redeemed_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "unused")
    .select("tier, duration_days, redeemed_at")
    .maybeSingle();

  if (error) return { ok: false, error: "unavailable" };

  if (!data) {
    // The conditional update matched nothing: the code is either unknown or
    // already redeemed. Distinguish so we can show a precise message.
    const { data: existing } = await supabase
      .from("redemption_codes")
      .select("status")
      .eq("code", code)
      .maybeSingle();
    return { ok: false, error: existing ? "used" : "invalid" };
  }

  const start = data.redeemed_at ? new Date(data.redeemed_at).getTime() : Date.now();
  const expiresAt = new Date(start + (data.duration_days ?? 30) * DAY_MS).toISOString();
  return { ok: true, tier: data.tier as GrantTier, expiresAt };
}
