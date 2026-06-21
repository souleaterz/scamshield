import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import {
  listMembers,
  addMember,
  revokeMember,
  inviteUrl,
  MAX_MEMBERS,
} from "@/app/lib/family";

export const runtime = "nodejs";

async function requireGuardian(): Promise<string | NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const tier = await getTierForUser(userId);
  if (tier !== "family") {
    return NextResponse.json(
      { error: "The Family plan is required to protect others." },
      { status: 403 },
    );
  }
  return userId;
}

function withUrls(members: Awaited<ReturnType<typeof listMembers>>) {
  return members.map((m) => ({ ...m, invite_url: inviteUrl(m.invite_code) }));
}

export async function GET() {
  const g = await requireGuardian();
  if (g instanceof NextResponse) return g;
  return NextResponse.json({ members: withUrls(await listMembers(g)) });
}

export async function POST(request: Request) {
  const g = await requireGuardian();
  if (g instanceof NextResponse) return g;

  let body: { label?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (label.length < 1) {
    return NextResponse.json({ error: "Give this person a name." }, { status: 400 });
  }

  const current = await listMembers(g);
  if (current.length >= MAX_MEMBERS) {
    return NextResponse.json(
      { error: `Family plans cover up to ${MAX_MEMBERS} people.` },
      { status: 400 },
    );
  }

  const member = await addMember(g, label);
  if (!member) {
    return NextResponse.json({ error: "Couldn't add that person." }, { status: 500 });
  }
  return NextResponse.json({
    member: { ...member, invite_url: inviteUrl(member.invite_code) },
  });
}

export async function DELETE(request: Request) {
  const g = await requireGuardian();
  if (g instanceof NextResponse) return g;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const ok = await revokeMember(g, id);
  return NextResponse.json({ ok });
}
