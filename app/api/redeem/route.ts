import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { redeemCode } from "@/app/lib/redemption";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "signin" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const code = typeof (body as { code?: unknown })?.code === "string"
    ? (body as { code: string }).code
    : "";
  if (!code.trim()) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const result = await redeemCode(code, userId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
