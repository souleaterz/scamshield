import Stripe from "stripe";
import type { Tier } from "@/app/lib/scamAnalysis";

let cached: Stripe | null = null;

/** Server-only Stripe client. Returns null until Stripe is configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const PAID_TIERS = ["pro", "family"] as const;
export type PaidTier = (typeof PAID_TIERS)[number];

export function isPaidTier(value: unknown): value is PaidTier {
  return (
    typeof value === "string" &&
    (PAID_TIERS as readonly string[]).includes(value)
  );
}

/** Stripe Price ID for a paid plan, from env. */
export function priceIdForTier(tier: PaidTier): string | undefined {
  if (tier === "family") return process.env.STRIPE_PRICE_FAMILY;
  return process.env.STRIPE_PRICE_PRO;
}

/** Reverse mapping used by the webhook: Price ID → tier. */
export function tierForPriceId(priceId: string | null | undefined): Tier {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_FAMILY) return "family";
  return "free";
}
