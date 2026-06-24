import { getDecoyStats } from "@/app/lib/decoyStats";
import DecoyCounterClient from "./DecoyCounterClient";

export default async function DecoyCounter() {
  const stats = await getDecoyStats();
  if (stats.totalSessions === 0) return null;
  return <DecoyCounterClient {...stats} />;
}
