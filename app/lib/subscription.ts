import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { tierForPriceId } from "@/app/lib/stripe";
import { getActiveGrantTier } from "@/app/lib/redemption";
import type { Tier } from "@/app/lib/scamAnalysis";

const VALID_TIERS: Tier[] = ["free", "pro", "family"];

/** Subscription period end lives on the sub or its item depending on API version. */
function readPeriodEnd(sub: Stripe.Subscription): number | null {
  const top = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  if (typeof top === "number") return top;
  const item = sub.items?.data?.[0] as unknown as
    | { current_period_end?: number }
    | undefined;
  return typeof item?.current_period_end === "number"
    ? item.current_period_end
    : null;
}

/**
 * Upsert a user's subscription row from a Stripe Subscription object. Resolves
 * the Clerk user ID from (in order): an explicit hint, the existing row matched
 * by customer ID, or the customer's metadata. No-ops without Supabase.
 */
export async function syncStripeSubscription(
  sub: Stripe.Subscription,
  userIdHint?: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const active = sub.status === "active" || sub.status === "trialing";
  const tier: Tier = active ? tierForPriceId(priceId) : "free";

  let userId = userIdHint ?? null;
  if (!userId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    userId = (sub.metadata?.userId as string | undefined) ?? null;
  }
  if (!userId) {
    console.error("Could not resolve user for Stripe subscription", sub.id);
    return;
  }

  const periodEnd = readPeriodEnd(sub);
  const { error } = await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    tier,
    status: sub.status,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("Failed to sync subscription:", error.message);
}

/**
 * The active tier for a signed-in user. Reads the subscriptions table (kept in
 * sync by the Stripe webhook) and defaults to "free" — for anonymous users,
 * when Supabase isn't configured, or on any lookup error.
 */
export async function getTierForUser(userId: string | null): Promise<Tier> {
  if (!userId) return "free";

  const supabase = getSupabaseAdmin();
  if (!supabase) return "free";

  const { data } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();

  const ownTier =
    data && VALID_TIERS.includes(data.tier as Tier) ? (data.tier as Tier) : "free";

  // A redeemed gift code grants Pro/Family for a fixed window with no Stripe
  // subscription. Take whichever is higher — the paid sub or the active grant.
  const rank: Record<Tier, number> = { free: 0, pro: 1, family: 2 };
  let best: Tier = ownTier;
  const giftTier = await getActiveGrantTier(supabase, userId);
  if (giftTier && rank[giftTier] > rank[best]) best = giftTier;
  if (best !== "free") return best;

  // Not a paying subscriber — but protected members of an active Family plan
  // get Pro-level access (unlimited checks, photo/company checks, no ads).
  if (await isProtectedFamilyMember(supabase, userId)) return "pro";

  return "free";
}

/**
 * True if this user is an accepted member of a guardian who currently holds a
 * Family subscription. (tier only equals 'family' while the sub is active/
 * trialing, since the webhook resets it to 'free' otherwise.)
 */
async function isProtectedFamilyMember(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
): Promise<boolean> {
  const { data: link } = await supabase
    .from("family_members")
    .select("guardian_user_id")
    .eq("member_user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!link?.guardian_user_id) return false;

  const { data: guardianSub } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", link.guardian_user_id)
    .maybeSingle();

  return guardianSub?.tier === "family";
}
