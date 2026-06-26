import { getGlobalStats } from "@/app/lib/globalStats";
import GlobalStatsClient from "./GlobalStatsClient";

export default async function GlobalStats() {
  const stats = await getGlobalStats();
  return <GlobalStatsClient {...stats} />;
}
