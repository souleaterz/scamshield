import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

export interface HistoryItem {
  id: string;
  risk_level: string;
  detected_type: string | null;
  summary: string | null;
  tier: string;
  created_at: string;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to view your history." },
      { status: 401 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ checks: [] });
  }

  const { data, error } = await supabase
    .from("usage_checks")
    .select("id, risk_level, detected_type, summary, tier, created_at")
    .eq("identifier", `user:${userId}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("History fetch failed:", error.message);
    return NextResponse.json({ checks: [] });
  }

  return NextResponse.json({ checks: (data ?? []) as HistoryItem[] });
}
