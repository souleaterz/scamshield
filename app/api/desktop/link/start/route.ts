import { NextResponse } from "next/server";
import { startDeviceLink } from "@/app/lib/desktopLink";

export const runtime = "nodejs";

export async function POST() {
  const link = await startDeviceLink();
  if (!link) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json(link);
}
