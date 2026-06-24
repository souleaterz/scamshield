import { getSupabaseAdmin } from "@/app/lib/supabase";

export interface DecoyStats {
  totalSessions: number;
  totalSecondsWasted: number;
}

interface SessionRow {
  time_wasted_seconds?: number | null;
  first_reply_at?: string | null;
  last_message_at?: string | null;
}

/**
 * Real engagement time for one decoy. When the conversation ran through the
 * relay we have genuine message timestamps, so "time wasted" is the span from
 * the scammer's first reply to their last activity — not client wall-clock.
 * Sessions without a reply (or pre-relay manual ones) fall back to the
 * client-reported value.
 */
export function engagementSeconds(r: SessionRow): number {
  if (r.first_reply_at && r.last_message_at) {
    const secs = Math.floor(
      (new Date(r.last_message_at).getTime() -
        new Date(r.first_reply_at).getTime()) /
        1000,
    );
    return Math.max(0, secs);
  }
  return r.time_wasted_seconds ?? 0;
}

/** Aggregate stats for the homepage counter. */
export async function getDecoyStats(): Promise<DecoyStats> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { totalSessions: 0, totalSecondsWasted: 0 };

  const { data, error } = await supabase
    .from("decoy_sessions")
    .select("time_wasted_seconds, first_reply_at, last_message_at");

  if (error || !data) return { totalSessions: 0, totalSecondsWasted: 0 };

  const totalSecondsWasted = data.reduce(
    (sum, row) => sum + engagementSeconds(row),
    0,
  );
  return { totalSessions: data.length, totalSecondsWasted };
}
