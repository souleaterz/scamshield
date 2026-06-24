import { NextResponse } from "next/server";
import { getUserIdFromRequest, getClientIp } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { generatePersona, generateDecoyReply, type SupportedCountry, COUNTRY_LABELS } from "@/app/lib/decoyPersona";

export const runtime = "nodejs";

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

  const { scamEmailContent, country: rawCountry } = (body ?? {}) as {
    scamEmailContent?: string;
    country?: string;
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
      })
      .select("id")
      .single();

    if (error) {
      console.error("[decoy] failed to persist session:", error.message);
    } else {
      sessionId = data?.id ?? null;
    }
  }

  return NextResponse.json({ sessionId, persona, reply });
}
