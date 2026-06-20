import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { getUserId, getClientIp } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Comments aren't available yet." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { entityId, authorName, body: commentBody } = (body ?? {}) as {
    entityId?: unknown;
    authorName?: unknown;
    body?: unknown;
  };

  if (typeof entityId !== "string" || !entityId) {
    return NextResponse.json({ error: "Missing entity ID." }, { status: 400 });
  }
  if (
    typeof commentBody !== "string" ||
    commentBody.trim().length < 10 ||
    commentBody.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Comment must be between 10 and 500 characters." },
      { status: 400 },
    );
  }

  // Verify the entity exists
  const { data: entity } = await supabase
    .from("entity_pages")
    .select("id")
    .eq("id", entityId)
    .maybeSingle();
  if (!entity) {
    return NextResponse.json({ error: "Entity not found." }, { status: 404 });
  }

  const ip = getClientIp(request);

  // Rate limit: max 5 comments per IP per hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("entity_comments")
    .select("*", { count: "exact", head: true })
    .eq("commenter_ip", ip)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Too many comments. Please wait a while." },
      { status: 429 },
    );
  }

  const userId = await getUserId();

  const { error } = await supabase.from("entity_comments").insert({
    entity_id: entityId,
    user_id: userId ?? null,
    author_name:
      typeof authorName === "string" && authorName.trim()
        ? authorName.trim().slice(0, 60)
        : null,
    body: commentBody.trim(),
    commenter_ip: ip,
  });

  if (error) {
    console.error("[entity-comments] insert failed:", error.message);
    return NextResponse.json(
      { error: "Failed to save your comment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
