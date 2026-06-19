import { NextResponse } from "next/server";
import { getUserId, getClientIp } from "@/app/lib/auth";
import { submitCommunityReport } from "@/app/lib/communityReports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { items } = (body ?? {}) as {
    items?: { inputType?: unknown; inputValue?: unknown }[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items to report." }, { status: 400 });
  }

  const valid = items
    .slice(0, 10)
    .filter(
      (i) =>
        (i.inputType === "domain" || i.inputType === "phone") &&
        typeof i.inputValue === "string" &&
        i.inputValue.length > 0,
    ) as { inputType: "domain" | "phone"; inputValue: string }[];

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid items to report." }, { status: 400 });
  }

  const userId = await getUserId();
  const ip = getClientIp(request);
  // Label the report with who submitted it — stored in source_label for user reports.
  const reporterLabel = userId ? `user:${userId}` : `ip:${ip}`;
  void reporterLabel; // reserved for future per-reporter dedup table

  await submitCommunityReport(valid, "user");

  return NextResponse.json({ ok: true, reported: valid.length });
}
