import { getSupabaseAdmin } from "@/app/lib/supabase";

export interface GlobalStats {
  pagesProtected: number;
  threatsBlocked: number;
}

/** Read the aggregated protection counters. Returns zeros if not configured. */
export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { pagesProtected: 0, threatsBlocked: 0 };

  const { data, error } = await supabase
    .from("global_stats")
    .select("key, value");

  if (error || !data) return { pagesProtected: 0, threatsBlocked: 0 };

  const byKey = new Map(data.map((r) => [r.key, Number(r.value) || 0]));
  return {
    pagesProtected: byKey.get("pages_protected") ?? 0,
    threatsBlocked: byKey.get("threats_blocked") ?? 0,
  };
}

/** Atomically bump the global counters. Best-effort, no-ops without Supabase. */
export async function incrementGlobalStats(
  pages: number,
  threats: number,
): Promise<void> {
  if (pages <= 0 && threats <= 0) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.rpc("increment_global_stats", {
    p_pages: pages,
    p_threats: threats,
  });
  if (error) console.error("[globalStats] increment failed:", error.message);
}
