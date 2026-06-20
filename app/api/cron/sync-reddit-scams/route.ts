import { NextResponse } from "next/server";
import { findNumbers } from "libphonenumber-js";
import { submitCommunityReport } from "@/app/lib/communityReports";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RedditPost {
  title: string;
  selftext: string;
  created_utc: number;
  permalink: string;
}

interface RedditListing {
  data: {
    children: { data: RedditPost }[];
    after: string | null;
  };
}

async function fetchPage(after?: string): Promise<RedditListing | null> {
  const url = new URL("https://www.reddit.com/r/ScamNumbers/new.json");
  url.searchParams.set("limit", "100");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Guardurai/1.0 (scam-protection-tool)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<RedditListing>;
}

function extractPhones(text: string): string[] {
  const results = new Set<string>();

  // Try US numbers first (r/ScamNumbers is mostly US), then UK
  for (const country of ["US", "GB"] as const) {
    const found = findNumbers(text, { defaultCountry: country, v2: true });
    for (const { number } of found) {
      results.add(number.format("E.164"));
    }
  }

  return [...results];
}

export async function GET(request: Request) {
  // Verify cron secret — Vercel passes Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const maxPages = Math.min(
    parseInt(url.searchParams.get("pages") ?? "3", 10),
    10,
  );

  const posts: RedditPost[] = [];
  let after: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const listing = await fetchPage(after ?? undefined);
    if (!listing) break;
    const items = listing.data.children.map((c) => c.data);
    posts.push(...items);
    if (!listing.data.after) break;
    after = listing.data.after;
  }

  // Extract phone numbers from each post
  const items: { inputType: "phone"; inputValue: string }[] = [];
  const seen = new Set<string>();

  for (const post of posts) {
    const text = `${post.title} ${post.selftext}`;
    for (const phone of extractPhones(text)) {
      if (!seen.has(phone)) {
        seen.add(phone);
        items.push({ inputType: "phone", inputValue: phone });
      }
    }
  }

  if (items.length > 0) {
    await submitCommunityReport(items, "reddit", "Reddit r/ScamNumbers");
  }

  return NextResponse.json({
    ok: true,
    postsScanned: posts.length,
    phonesFound: items.length,
  });
}
