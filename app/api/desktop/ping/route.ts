import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { getTierForUser } from "@/app/lib/subscription";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase().trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] });

  if (!users.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = users[0];
  const supabase = getSupabaseAdmin();
  const tier = await getTierForUser(supabase, user.id);
  const name = user.firstName || email.split("@")[0];

  return NextResponse.json({ name, email, tier });
}
