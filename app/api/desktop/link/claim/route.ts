import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { claimDeviceLink } from "@/app/lib/desktopLink";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { code } = (body ?? {}) as { code?: unknown };
  if (typeof code !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await claimDeviceLink(code, userId);
  if (!result.ok) {
    const status = result.error === "unavailable" ? 503 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
