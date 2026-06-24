import { NextResponse } from "next/server";
import { getUserIdFromRequest, getClientIp } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { generatePersona, generateDecoyReply, type SupportedCountry, COUNTRY_LABELS } from "@/app/lib/decoyPersona";
import {
  isRelayConfigured,
  makeRelayAddress,
  relayFrom,
  sendDecoyEmail,
} from "@/app/lib/decoyRelay";

export const runtime = "nodejs";

/** Pull the subject from extracted email text ("Subject: ..." first line). */
function replySubject(scamEmailContent: string | undefined): string {
  const m = scamEmailContent?.match(/^Subject:\s*(.+)$/im);
  const subj = m?.[1]?.trim();
  if (!subj) return "Re: your message";
  return /^re:/i.test(subj) ? subj : `Re: ${subj}`;
}

/** Basic shape check so we never try to send to garbage. */
function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const DAILY_LIMITS = { free: 1, pro: 20, family: 20 } as const;

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { scamEmailContent, country: rawCountry, scammerEmail } = (body ?? {}) as {
    scamEmailContent?: string;
    country?: string;
    scammerEmail?: string;
  };

  const VALID_COUNTRIES = Object.keys(COUNTRY_LABELS) as SupportedCountry[];
  const country: SupportedCountry = VALID_COUNTRIES.includes(rawCountry as SupportedCountry)
    ? (rawCountry as SupportedCountry)
    : "GB";

  const userId = await getUserIdFromRequest(request);
  const ip = getClientIp(request);
  const tier = await getTierForUser(userId);
  const identifier = userId ? `user:${userId}` : `ip:${ip}`;
  const dailyLimit = DAILY_LIMITS[tier];

  const supabase = getSupabaseAdmin();

  // Rate-limit check against today's decoy sessions
  if (supabase) {
    const { count } = await supabase
      .from("decoy_sessions")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("started_at", startOfUtcDay());

    if ((count ?? 0) >= dailyLimit) {
      return NextResponse.json(
        {
          error: "Daily decoy limit reached.",
          limit: dailyLimit,
          limitReached: true,
          tier,
        },
        { status: 429 },
      );
    }
  }

  const persona = generatePersona(country);

  // Generate AI reply if scam email content was provided
  let reply: string | null = null;
  if (scamEmailContent?.trim()) {
    try {
      reply = await generateDecoyReply({ scamEmailContent, persona });
    } catch (err) {
      console.error("[decoy] reply generation failed:", err);
    }
  }

  // Decide whether this decoy runs through the relay (system sends + captures
  // replies) or the legacy manual flow (user copies the reply themselves).
  const useRelay = isRelayConfigured() && isEmail(scammerEmail) && Boolean(reply);
  const relayAddress = useRelay ? makeRelayAddress(persona) : null;

  // Persist the session
  let sessionId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from("decoy_sessions")
      .insert({
        identifier,
        identifier_type: userId ? "user" : "ip",
        user_id: userId,
        persona,
        initial_reply: reply,
        status: "active",
        relay_address: relayAddress,
        scammer_email: useRelay ? scammerEmail : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[decoy] failed to persist session:", error.message);
    } else {
      sessionId = data?.id ?? null;
    }
  }

  // Relay path: send the opening message from the decoy address and record it.
  let relayActive = false;
  if (useRelay && relayAddress && sessionId && supabase && reply) {
    const subject = replySubject(scamEmailContent);
    const sent = await sendDecoyEmail({
      from: relayFrom(persona, relayAddress),
      to: scammerEmail as string,
      subject,
      text: reply,
    });
    if (sent) {
      relayActive = true;
      const now = new Date().toISOString();
      await supabase.from("decoy_messages").insert({
        session_id: sessionId,
        direction: "outbound",
        from_addr: relayAddress,
        to_addr: scammerEmail,
        subject,
        body: reply,
      });
      await supabase
        .from("decoy_sessions")
        .update({ last_message_at: now, message_count: 1 })
        .eq("id", sessionId);
    }
  }

  // When the relay sent the opener, the user doesn't need the reply text — the
  // conversation is now handled server-side.
  return NextResponse.json({
    sessionId,
    persona,
    reply: relayActive ? null : reply,
    relayActive,
  });
}
