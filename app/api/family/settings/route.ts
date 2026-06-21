import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import { getAlertEmail, setAlertEmail } from "@/app/lib/family";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  return NextResponse.json({ alertEmail: await getAlertEmail(userId) });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const tier = await getTierForUser(userId);
  if (tier !== "family") {
    return NextResponse.json({ error: "Family plan required." }, { status: 403 });
  }

  let body: { alertEmail?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  const email = typeof body.alertEmail === "string" ? body.alertEmail.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const ok = await setAlertEmail(userId, email);
  return NextResponse.json({ ok });
}
