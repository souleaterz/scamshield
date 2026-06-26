import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

// Per-request cap so a tampered client can't wildly inflate the global counter.
// A 5-minute sync from one user realistically reports far fewer than this.
const MAX_PER_REQUEST = 2000;

function clampDelta(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0;
  return Math.min(Math.floor(v), MAX_PER_REQUEST);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { pagesProtected, threatsBlocked } = (body ?? {}) as {
    pagesProtected?: number;
    threatsBlocked?: number;
  };

  const pages = clampDelta(pagesProtected);
  const threats = clampDelta(threatsBlocked);
  if (pages === 0 && threats === 0) return NextResponse.json({ ok: true });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true });

  const { error } = await supabase.rpc("increment_global_stats", {
    p_pages: pages,
    p_threats: threats,
  });
  if (error) {
    console.error("[stats/contribute] increment failed:", error.message);
    // Report failure so the extension keeps the delta and retries next flush.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
