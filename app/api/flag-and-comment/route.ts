import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { getUserId, getClientIp } from "@/app/lib/auth";
import { submitCommunityReport } from "@/app/lib/communityReports";
import {
  flagEntityPage,
  phoneToSlug,
  domainToSlug,
} from "@/app/lib/entityPages";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { phones, domains, comment, authorName } = (body ?? {}) as {
    phones?: unknown;
    domains?: unknown;
    comment?: unknown;
    authorName?: unknown;
  };

  const phoneList = Array.isArray(phones)
    ? (phones as unknown[]).filter((p): p is string => typeof p === "string")
    : [];
  const domainList = Array.isArray(domains)
    ? (domains as unknown[]).filter((d): d is string => typeof d === "string")
    : [];

  const commentText =
    typeof comment === "string" ? comment.trim() : "";
  if (commentText.length < 10) {
    return NextResponse.json(
      { error: "Please write at least 10 characters explaining why." },
      { status: 400 },
    );
  }
  if (commentText.length > 500) {
    return NextResponse.json(
      { error: "Comment must be under 500 characters." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const ip = getClientIp(request);
  const userId = await getUserId();
  const cleanAuthor =
    typeof authorName === "string" && authorName.trim()
      ? authorName.trim().slice(0, 60)
      : null;

  // Rate limit: 5 flag+comment submissions per IP per hour
  if (supabase) {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supabase
      .from("entity_comments")
      .select("*", { count: "exact", head: true })
      .eq("commenter_ip", ip)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Too many reports. Please wait a while." },
        { status: 429 },
      );
    }
  }

  const entities: { type: "phone" | "domain"; slug: string; display: string }[] = [
    ...phoneList.slice(0, 5).map((e164) => ({
      type: "phone" as const,
      slug: phoneToSlug(e164),
      display: e164,
    })),
    ...domainList.slice(0, 5).map((host) => ({
      type: "domain" as const,
      slug: domainToSlug(host),
      display: host,
    })),
  ];

  const entityUrls: string[] = [];

  await Promise.all(
    entities.map(async ({ type, slug, display }) => {
      // 1. Flag entity page (creates if new, upgrades risk if existing)
      const entityId = await flagEntityPage(type, slug, display);

      // 2. Attach the user's comment to the entity page
      if (entityId && supabase) {
        await supabase.from("entity_comments").insert({
          entity_id: entityId,
          user_id: userId ?? null,
          author_name: cleanAuthor,
          body: commentText,
          commenter_ip: ip,
        });
        entityUrls.push(`/c/${type}/${slug}`);
      }
    }),
  );

  // 3. Also increment scam_reports so future AI checks see the flags
  const reportItems = [
    ...phoneList.map((e164) => ({ inputType: "phone" as const, inputValue: e164 })),
    ...domainList.map((host) => ({ inputType: "domain" as const, inputValue: host })),
  ];
  await submitCommunityReport(reportItems, "user");

  return NextResponse.json({ success: true, entityUrls });
}
