import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { engagementSeconds } from "@/app/lib/decoyStats";

export const runtime = "nodejs";

/** Live status for one decoy session — drives the extension's relay-mode card. */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ messageCount: 0, secondsWasted: 0 });

  const { data, error } = await supabase
    .from("decoy_sessions")
    .select("message_count, first_reply_at, last_message_at, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ messageCount: 0, secondsWasted: 0 });
  }

  return NextResponse.json({
    messageCount: data.message_count ?? 0,
    secondsWasted: engagementSeconds(data),
    replied: Boolean(data.first_reply_at),
    status: data.status ?? "active",
  });
}
