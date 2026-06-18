import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { getStripe, isStripeConfigured } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't available yet." },
      { status: 503 },
    );
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = supabase
    ? await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  const customerId = data?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account found yet." },
      { status: 404 },
    );
  }

  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const session = await getStripe()!.billingPortal.sessions.create({
    customer: customerId,
    return_url: origin,
  });

  return NextResponse.json({ url: session.url });
}
