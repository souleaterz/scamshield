import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { sendEmail, isEmailConfigured } from "@/app/lib/email";
import { SITE_URL } from "@/app/lib/site";

export const runtime = "nodejs";

const EXTENSION_URL = "https://chromewebstore.google.com/detail/guardurai";

export async function POST(request: Request) {
  const guardianId = await getUserId();
  if (!guardianId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if ((await getTierForUser(guardianId)) !== "family") {
    return NextResponse.json({ error: "Family plan required." }, { status: 403 });
  }

  let body: { memberId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) {
    return NextResponse.json({ error: "Missing member." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  // Verify the member belongs to this guardian and has accepted.
  const { data: member } = await supabase
    .from("family_members")
    .select("member_label, member_user_id, status")
    .eq("id", memberId)
    .eq("guardian_user_id", guardianId)
    .maybeSingle();

  if (!member || member.status !== "active" || !member.member_user_id) {
    return NextResponse.json(
      { error: "That person hasn't accepted their invite yet." },
      { status: 400 },
    );
  }

  if (!isClerkConfigured() || !isEmailConfigured()) {
    return NextResponse.json(
      { error: "Reminders aren't available right now." },
      { status: 503 },
    );
  }

  // Fetch the member's email from Clerk.
  let email: string | null = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(member.member_user_id as string);
    email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;
  } catch {
    email = null;
  }
  if (!email) {
    return NextResponse.json(
      { error: "Couldn't find an email for this person." },
      { status: 400 },
    );
  }

  const sent = await sendEmail({
    to: email,
    subject: "Add Guardurai to your browser for automatic scam protection",
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">🛡️ One quick step to stay protected</h2>
        <p style="color:#334155;font-size:15px">
          Someone who cares about you set you up with <strong>Guardurai</strong>
          — free protection that warns you the moment you land on a scam or
          phishing website.
        </p>
        <p style="color:#334155;font-size:15px">
          To turn on real-time protection, add the free browser extension:
        </p>
        <p style="margin:22px 0">
          <a href="${EXTENSION_URL}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">
            Add Guardurai to my browser
          </a>
        </p>
        <p style="color:#94a3b8;font-size:12px">
          Then sign in at ${SITE_URL} so your protection is linked. It only takes
          a minute and it's completely free.
        </p>
      </div>`,
  });

  if (!sent) {
    return NextResponse.json({ error: "Couldn't send the reminder." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
