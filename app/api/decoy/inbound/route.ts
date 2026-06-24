import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

/**
 * Inbound webhook for scammer replies, fed by Postmark's inbound parsing.
 * Postmark POSTs JSON for each email received at the decoy subdomain; we match
 * the recipient to a decoy session and append it to the transcript.
 *
 * Secure by setting DECOY_INBOUND_SECRET and pointing Postmark at
 *   /api/decoy/inbound?token=<secret>
 */

interface PostmarkInbound {
  FromFull?: { Email?: string; Name?: string };
  From?: string;
  ToFull?: { Email?: string }[];
  To?: string;
  Subject?: string;
  TextBody?: string;
  StrippedTextReply?: string;
}

function recipientsOf(p: PostmarkInbound): string[] {
  const out: string[] = [];
  for (const t of p.ToFull ?? []) if (t.Email) out.push(t.Email.toLowerCase());
  if (p.To) {
    // "To" can be a comma-separated list of "Name <addr>" entries.
    for (const part of p.To.split(",")) {
      const m = part.match(/<([^>]+)>/) ?? [null, part.trim()];
      if (m[1]) out.push(m[1].toLowerCase());
    }
  }
  return [...new Set(out)];
}

export async function POST(request: Request) {
  // Optional shared-secret gate.
  const secret = process.env.DECOY_INBOUND_SECRET;
  if (secret) {
    const token = new URL(request.url).searchParams.get("token");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  let payload: PostmarkInbound;
  try {
    payload = (await request.json()) as PostmarkInbound;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true }); // nothing to store yet

  const recipients = recipientsOf(payload);
  if (recipients.length === 0) return NextResponse.json({ ok: true });

  // Find the decoy this reply belongs to.
  const { data: session } = await supabase
    .from("decoy_sessions")
    .select("id, first_reply_at, message_count, relay_address")
    .in("relay_address", recipients)
    .maybeSingle();

  if (!session) {
    // Not one of ours (or already deleted) — ack so Postmark doesn't retry.
    return NextResponse.json({ ok: true, matched: false });
  }

  const from = payload.FromFull?.Email ?? payload.From ?? null;
  const body = (payload.StrippedTextReply ?? payload.TextBody ?? "").trim();
  const now = new Date().toISOString();

  await supabase.from("decoy_messages").insert({
    session_id: session.id,
    direction: "inbound",
    from_addr: from,
    to_addr: session.relay_address,
    subject: payload.Subject ?? null,
    body,
  });

  await supabase
    .from("decoy_sessions")
    .update({
      // first scammer reply marks the start of real engagement
      first_reply_at: session.first_reply_at ?? now,
      last_message_at: now,
      message_count: (session.message_count ?? 0) + 1,
    })
    .eq("id", session.id);

  return NextResponse.json({ ok: true, matched: true });
}
