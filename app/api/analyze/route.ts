import { NextResponse } from "next/server";
import { after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  analyzeContent,
  type ImageMediaType,
  type Tier,
  type Verdict,
} from "@/app/lib/scamAnalysis";
import { getUserIdFromRequest, getClientIp } from "@/app/lib/auth";
import { checkRateLimit, recordCheck } from "@/app/lib/rateLimit";
import { getTierForUser } from "@/app/lib/subscription";
import { checkUrlsInText, describeChecks } from "@/app/lib/urlReputation";
import { checkPhonesInText, describePhoneChecks } from "@/app/lib/phoneReputation";
import { lookupCommunityReports, describeCommunityReports } from "@/app/lib/communityReports";
import { upsertEntitiesFromVerdict } from "@/app/lib/entityPages";
import { notifyGuardianOfScam } from "@/app/lib/family";
import { incrementGlobalStats } from "@/app/lib/globalStats";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_MEDIA_TYPES: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// ~7MB of base64 ≈ ~5MB raw image. Keep requests within serverless limits.
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { text, image, emailContext } = (body ?? {}) as {
    text?: unknown;
    image?: { media_type?: unknown; data?: unknown };
    emailContext?: unknown;
  };

  const trimmedText = typeof text === "string" ? text.trim() : "";

  let validatedImage: { media_type: ImageMediaType; data: string } | undefined;
  if (image && typeof image === "object") {
    const { media_type, data } = image;
    if (typeof media_type !== "string" || typeof data !== "string") {
      return NextResponse.json(
        { error: "Image must include a media_type and base64 data." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MEDIA_TYPES.includes(media_type as ImageMediaType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP." },
        { status: 400 },
      );
    }
    if (data.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "Image is too large. Please use an image under ~5MB." },
        { status: 413 },
      );
    }
    validatedImage = { media_type: media_type as ImageMediaType, data };
  }

  if (!trimmedText && !validatedImage) {
    return NextResponse.json(
      { error: "Provide some text or an image to check." },
      { status: 400 },
    );
  }

  try {
    // Identify the caller: signed-in users by Clerk ID (cookie), everyone else
    // by IP.
    const userId = await getUserIdFromRequest(request);
    const ip = getClientIp(request);
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const identifierType: "ip" | "user" = userId ? "user" : "ip";
    // Signed-in users get their subscribed tier; anonymous visitors are free.
    const tier: Tier = await getTierForUser(userId);

    const limit = await checkRateLimit(identifier, tier);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "You've used your free check for today.",
          limitReached: true,
          limit: limit.limit,
          used: limit.used,
        },
        { status: 429 },
      );
    }

    // Hard-signal checks run in parallel before the Claude call.
    const [linkChecks, phoneChecks, communityMatches] = await Promise.all([
      trimmedText ? checkUrlsInText(trimmedText) : Promise.resolve([]),
      trimmedText ? checkPhonesInText(trimmedText) : Promise.resolve([]),
      trimmedText ? lookupCommunityReports(trimmedText) : Promise.resolve([]),
    ]);

    const parsedEmailContext =
      typeof emailContext === "string" && emailContext.trim()
        ? emailContext.trim()
        : null;

    const hardSignals = [
      parsedEmailContext,
      describeCommunityReports(communityMatches),
      describeChecks(linkChecks),
      describePhoneChecks(phoneChecks),
    ]
      .filter(Boolean)
      .join("\n\n");

    const verdict = await analyzeContent({
      text: trimmedText || undefined,
      image: validatedImage,
      tier,
      linkContext: hardSignals || undefined,
    });

    // Best-effort: records usage for the daily limit + future history.
    await recordCheck({
      identifier,
      identifierType,
      tier,
      riskLevel: verdict.risk_level,
      detectedType: verdict.detected_type,
      summary: verdict.summary,
    });

    const fullVerdict: Verdict = {
      ...verdict,
      link_checks: linkChecks,
      phone_checks: phoneChecks,
      community_reports: communityMatches,
    };

    // Persist entity pages after response is sent — non-blocking, best-effort.
    after(() => void upsertEntitiesFromVerdict(fullVerdict));

    // A scam caught here (e.g. an email scanned via the extension) is a threat
    // blocked — feed it into the global homepage counter.
    if (verdict.risk_level === "likely_scam") {
      after(() => void incrementGlobalStats(0, 1));
    }

    // If a protected family member hits a likely scam, alert their guardian.
    if (userId && verdict.risk_level === "likely_scam") {
      const dedupKey = (
        linkChecks[0]?.host ??
        phoneChecks[0]?.e164 ??
        verdict.detected_type
      ).toLowerCase();
      after(() =>
        void notifyGuardianOfScam(userId, {
          summary: verdict.summary,
          detectedType: verdict.detected_type,
          dedupKey,
        }),
      );
    }

    // Depth-gate: free users already in our funnel — the extension, or anyone
    // signed in — get the verdict but not the AI explanation/advice. That's the
    // Pro unlock. The anonymous web checker stays full so it keeps building
    // trust and SEO. Paying users always get everything.
    const isExtension =
      request.headers.get("x-guardurai-client") === "extension";
    const paid = tier === "pro" || tier === "family";
    if (!paid && (isExtension || userId !== null)) {
      const gated: Record<string, unknown> = { ...fullVerdict, locked: true };
      delete gated.explanation;
      delete gated.advice;
      return NextResponse.json(gated);
    }

    return NextResponse.json(fullVerdict);
  } catch (err) {
    if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "The service is not configured. Missing API key." },
        { status: 503 },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "We're a bit busy right now. Please try again in a moment." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "The analysis service returned an error. Please try again." },
        { status: 502 },
      );
    }
    console.error("Unexpected error analysing content:", err);
    return NextResponse.json(
      { error: "Something went wrong while analysing. Please try again." },
      { status: 500 },
    );
  }
}
