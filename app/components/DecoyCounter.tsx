import { getSupabaseAdmin } from "@/app/lib/supabase";
import DecoyCounterClient from "./DecoyCounterClient";

async function getDecoyStats() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { totalSessions: 0, totalSecondsWasted: 0 };

  const { data, error } = await supabase
    .from("decoy_sessions")
    .select("time_wasted_seconds");

  if (error || !data) return { totalSessions: 0, totalSecondsWasted: 0 };

  return {
    totalSessions: data.length,
    totalSecondsWasted: data.reduce(
      (sum, row) => sum + (row.time_wasted_seconds ?? 0),
      0,
    ),
  };
}

export default async function DecoyCounter() {
  const stats = await getDecoyStats();
  if (stats.totalSessions === 0) return null;
  return <DecoyCounterClient {...stats} />;
}
