import { NextResponse } from "next/server";
import { getDeviceLinkStatus } from "@/app/lib/desktopLink";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ linked: false });

  const status = await getDeviceLinkStatus(token);
  return NextResponse.json(status);
}
