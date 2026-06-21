import { NextResponse } from "next/server";
import { findNumbers } from "libphonenumber-js";
import { submitCommunityReport } from "@/app/lib/communityReports";
import {
  upsertEntityPageFromReddit,
  insertRedditComment,
  domainToSlug,
  type RedditPost,
} from "@/app/lib/entityPages";
import { extractUrls } from "@/app/lib/urlReputation";
import type { RiskLevel } from "@/app/lib/scamAnalysis";

export const runtime = "nodejs";
export const maxDuration = 60;

// Domains to ignore when scraping — Reddit infrastructure, image hosts, etc.
const SKIP_DOMAINS = new Set([
  "reddit.com", "www.reddit.com", "i.redd.it", "v.redd.it",
  "preview.redd.it", "external-preview.redd.it",
  "imgur.com", "i.imgur.com",
  "gyazo.com", "prnt.sc", "ibb.co",
  "youtube.com", "youtu.be",
]);

interface RedditChild {
  data: {
    title: string;
    selftext: string;
    author: string;
    permalink: string;
    subreddit: string;
    url: string;       // link-post URL (may be external)
    is_self: boolean;  // true = text post, false = link post
    created_utc: number;
  };
}

interface RedditListing {
  data: { children: RedditChild[]; after: string | null };
}

const USER_AGENT = "web:guardurai.scamcheck:v1.0 (by /u/guardurai)";

/**
 * Reddit blocks the anonymous .json endpoint (403) from datacenter IPs, so we
 * authenticate with application-only OAuth (client_credentials). Requires a
 * "script" app registered at reddit.com/prefs/apps.
 */
async function getRedditToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function fetchPage(
  token: string,
  subreddit: string,
  after?: string,
): Promise<RedditListing | null> {
  const url = new URL(`https://oauth.reddit.com/r/${subreddit}/new`);
  url.searchParams.set("limit", "100");
  url.searchParams.set("raw_json", "1");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<RedditListing>;
}

function extractPhones(text: string): string[] {
  const out = new Set<string>();
  for (const country of ["US", "GB"] as const) {
    for (const { number } of findNumbers(text, { defaultCountry: country, v2: true })) {
      out.add(number.format("E.164"));
    }
  }
  return [...out];
}

function extractDomains(text: string, linkUrl?: string): string[] {
  const out = new Set<string>();
  const urls = extractUrls(text);
  if (linkUrl && !linkUrl.startsWith("https://www.reddit.com")) urls.push(linkUrl);
  for (const raw of urls) {
    try {
      const host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname
        .toLowerCase()
        .replace(/^www\./, "");
      if (!SKIP_DOMAINS.has(host) && host.includes(".")) out.add(host);
    } catch {
      /* ignore malformed */
    }
  }
  return [...out];
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getRedditToken();
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Reddit auth failed — set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (script app at reddit.com/prefs/apps).",
      },
      { status: 502 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const maxPages = Math.min(parseInt(searchParams.get("pages") ?? "3", 10), 10);

  const SUBREDDITS: { name: string; riskLevel: RiskLevel }[] = [
    { name: "ScamNumbers", riskLevel: "likely_scam" },
    { name: "isthisascam", riskLevel: "suspicious" },
  ];

  let totalPosts = 0;
  let totalPhones = 0;
  let totalDomains = 0;

  for (const { name: subreddit, riskLevel } of SUBREDDITS) {
    const posts: RedditChild["data"][] = [];
    let after: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const listing = await fetchPage(token, subreddit, after);
      if (!listing) break;
      posts.push(...listing.data.children.map((c) => c.data));
      if (!listing.data.after) break;
      after = listing.data.after;
    }

    totalPosts += posts.length;

    for (const post of posts) {
      const fullText = `${post.title} ${post.selftext}`;
      const redditPost: RedditPost = {
        title: post.title,
        selftext: post.selftext ?? "",
        author: post.author,
        permalink: post.permalink,
        subreddit,
      };

      // ── Phones ─────────────────────────────────────────────────────────────
      const phones = extractPhones(fullText);
      for (const e164 of phones) {
        const slug = e164.replace(/^\+/, "");
        // Human-readable: "+1 (800) 555-0100" style — use E.164 as fallback
        const displayName = e164;

        const [entityId] = await Promise.all([
          upsertEntityPageFromReddit("phone", slug, displayName, riskLevel, redditPost),
          submitCommunityReport(
            [{ inputType: "phone", inputValue: e164 }],
            "reddit",
            `Reddit r/${subreddit}`,
          ),
        ]);

        if (entityId) await insertRedditComment(entityId, redditPost);
        totalPhones++;
      }

      // ── Domains ────────────────────────────────────────────────────────────
      const domains = extractDomains(
        fullText,
        post.is_self ? undefined : post.url,
      );
      for (const domain of domains) {
        const slug = domainToSlug(domain);

        const [entityId] = await Promise.all([
          upsertEntityPageFromReddit("domain", slug, domain, riskLevel, redditPost),
          submitCommunityReport(
            [{ inputType: "domain", inputValue: domain }],
            "reddit",
            `Reddit r/${subreddit}`,
          ),
        ]);

        if (entityId) await insertRedditComment(entityId, redditPost);
        totalDomains++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    postsScanned: totalPosts,
    phonesFound: totalPhones,
    domainsFound: totalDomains,
  });
}
