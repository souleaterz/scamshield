import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

// Cache the global stats for 60 seconds — no need to hit the DB on every page load
export const revalidate = 60;

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ totalSessions: 0, totalSecondsWasted: 0 });
  }

  const { data, error } = await supabase
    .from("decoy_sessions")
    .select("time_wasted_seconds")
    .eq("status", "active");

  if (error) {
    console.error("[decoy/stats] query failed:", error.message);
    return NextResponse.json({ totalSessions: 0, totalSecondsWasted: 0 });
  }

  const totalSessions = data.length;
  const totalSecondsWasted = data.reduce(
    (sum, row) => sum + (row.time_wasted_seconds ?? 0),
    0,
  );

  return NextResponse.json({ totalSessions, totalSecondsWasted });
}
