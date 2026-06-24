import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

// One scammer session can't plausibly waste more than a day of real time.
// Clamp to guard the global counter against a tampered client.
const MAX_SECONDS = 86_400;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { sessionId, secondsWasted } = (body ?? {}) as {
    sessionId?: string;
    secondsWasted?: number;
  };

  if (
    typeof sessionId !== "string" ||
    typeof secondsWasted !== "number" ||
    !Number.isFinite(secondsWasted) ||
    secondsWasted < 0
  ) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true });

  // The client reports total elapsed seconds for the session, so we SET (not
  // increment) — each heartbeat is idempotent and can't double-count.
  const secs = Math.min(Math.floor(secondsWasted), MAX_SECONDS);
  const { error } = await supabase
    .from("decoy_sessions")
    .update({
      time_wasted_seconds: secs,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[decoy/heartbeat] update failed:", error.message);
  }

  return NextResponse.json({ ok: true });
}
