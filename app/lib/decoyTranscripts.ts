import { getSupabaseAdmin } from "@/app/lib/supabase";
import { engagementSeconds } from "@/app/lib/decoyStats";

export interface TranscriptMessage {
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
}

export interface PrankTranscript {
  id: string;
  name: string; // persona first name only
  town: string;
  country: string;
  secondsWasted: number;
  messageCount: number;
  lastMessageAt: string | null;
  messages: TranscriptMessage[];
}

/**
 * Strip anything that could identify a real person or look like live data:
 * email addresses and long digit runs (card/account numbers). All persona data
 * is synthetic, but we redact defensively so transcripts read clean and safe.
 */
export function anonymise(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, "[email hidden]")
    .replace(/\b(?:\d[ -]?){11,}\b/g, "[number hidden]")
    .trim();
}

interface SessionRow {
  id: string;
  persona: {
    name?: { first?: string };
    address?: { town?: string };
    country?: string;
  } | null;
  message_count: number | null;
  first_reply_at: string | null;
  last_message_at: string | null;
}

function toTranscript(
  s: SessionRow,
  messages: TranscriptMessage[],
): PrankTranscript {
  return {
    id: s.id,
    name: s.persona?.name?.first ?? "Someone",
    town: s.persona?.address?.town ?? "",
    country: s.persona?.country ?? "GB",
    secondsWasted: engagementSeconds(s),
    messageCount: s.message_count ?? 0,
    lastMessageAt: s.last_message_at,
    messages,
  };
}

/** Gallery feed: sessions where the scammer actually replied, newest first. */
export async function getPrankTranscripts(limit = 30): Promise<PrankTranscript[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: sessions } = await supabase
    .from("decoy_sessions")
    .select("id, persona, message_count, first_reply_at, last_message_at")
    .not("first_reply_at", "is", null)
    .gte("message_count", 2)
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (!sessions?.length) return [];

  const ids = sessions.map((s) => s.id);
  const { data: msgs } = await supabase
    .from("decoy_messages")
    .select("session_id, direction, body, created_at")
    .in("session_id", ids)
    .order("created_at", { ascending: true });

  const bySession = new Map<string, TranscriptMessage[]>();
  for (const m of msgs ?? []) {
    const arr = bySession.get(m.session_id) ?? [];
    arr.push({ direction: m.direction, body: anonymise(m.body), created_at: m.created_at });
    bySession.set(m.session_id, arr);
  }

  return (sessions as SessionRow[]).map((s) =>
    toTranscript(s, bySession.get(s.id) ?? []),
  );
}

/** A single transcript for the shareable detail page. */
export async function getPrankTranscript(id: string): Promise<PrankTranscript | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: s } = await supabase
    .from("decoy_sessions")
    .select("id, persona, message_count, first_reply_at, last_message_at")
    .eq("id", id)
    .not("first_reply_at", "is", null)
    .maybeSingle();

  if (!s) return null;

  const { data: msgs } = await supabase
    .from("decoy_messages")
    .select("direction, body, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const messages: TranscriptMessage[] = (msgs ?? []).map((m) => ({
    direction: m.direction,
    body: anonymise(m.body),
    created_at: m.created_at,
  }));

  return toTranscript(s as SessionRow, messages);
}

/** "2h 14m", "47m", "38s" — compact human duration. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}
