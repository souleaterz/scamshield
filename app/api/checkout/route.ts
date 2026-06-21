import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import {
  getStripe,
  isStripeConfigured,
  isPaidTier,
  priceIdForTier,
} from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

function originOf(request: Request): string {
  return (
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Upgrades aren't available yet — check back soon." },
      { status: 503 },
    );
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to upgrade." },
      { status: 401 },
    );
  }

  let body: { tier?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine — falls through to validation */
  }
  if (!isPaidTier(body.tier)) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }
  const price = priceIdForTier(body.tier);
  if (!price) {
    return NextResponse.json(
      { error: "That plan isn't configured yet." },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;
  const supabase = getSupabaseAdmin();

  // Reuse this user's Stripe customer if we already have one.
  let customerId: string | undefined;
  if (supabase) {
    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    customerId = data?.stripe_customer_id ?? undefined;
  }
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { userId } });
    customerId = customer.id;
    if (supabase) {
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        tier: "free",
        updated_at: new Date().toISOString(),
      });
    }
  }

  const origin = originOf(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    metadata: { userId, tier: body.tier },
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 3,
      metadata: { userId, tier: body.tier },
    },
    success_url:
      body.tier === "family"
        ? `${origin}/family?upgraded=1`
        : `${origin}/?upgraded=1`,
    cancel_url: `${origin}/?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
