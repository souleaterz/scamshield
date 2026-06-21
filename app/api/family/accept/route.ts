import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { acceptInvite } from "@/app/lib/family";

export const runtime = "nodejs";

const MESSAGES: Record<string, string> = {
  invalid: "That invite link isn't valid.",
  revoked: "That invite has been cancelled.",
  self: "You can't add yourself as someone you protect.",
  unavailable: "Service unavailable — try again shortly.",
  failed: "Couldn't accept the invite. Please try again.",
};

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Please sign in to accept." }, { status: 401 });
  }

  let body: { code?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Missing invite code." }, { status: 400 });
  }

  const result = await acceptInvite(code, userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: MESSAGES[result.error ?? "failed"] ?? MESSAGES.failed },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
