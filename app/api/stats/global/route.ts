import { NextResponse } from "next/server";
import { getGlobalStats } from "@/app/lib/globalStats";

export const runtime = "nodejs";

// Cache for 60s — the totals don't need to be second-accurate.
export const revalidate = 60;

export async function GET() {
  return NextResponse.json(await getGlobalStats());
}
