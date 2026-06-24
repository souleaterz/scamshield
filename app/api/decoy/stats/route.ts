import { NextResponse } from "next/server";
import { getDecoyStats } from "@/app/lib/decoyStats";

export const runtime = "nodejs";

// Cache the global stats for 60 seconds — no need to hit the DB on every load.
export const revalidate = 60;

export async function GET() {
  const stats = await getDecoyStats();
  return NextResponse.json(stats);
}
