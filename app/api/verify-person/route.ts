import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserId, getClientIp } from "@/app/lib/auth";
import { checkRateLimit, recordCheck } from "@/app/lib/rateLimit";
import { getTierForUser } from "@/app/lib/subscription";
import type { Tier, ImageMediaType } from "@/app/lib/scamAnalysis";
import {
  reverseImageSearch,
  aiGeneratedCheck,
  computeRealScore,
  scoreToVerdict,
  type PersonVerificationResult,
} from "@/app/lib/imagePersonVerification";

export const runtime = "nodejs";
export const maxDuration = 45;

const ALLOWED_MEDIA_TYPES: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

const MODELS: Record<Tier, string> = {
  free: "claude-haiku-4-5",
  pro: "claude-sonnet-4-6",
  family: "claude-sonnet-4-6",
};

const SYSTEM_PROMPT = `You are a forensic image analyst specialising in detecting fake, AI-generated, and stolen profile photos used in romance scams, catfishing, and online fraud.

CRITICAL MINDSET: Modern AI image generators (Midjourney, Flux, Stable Diffusion, DALL·E, and others) now produce photos that look completely real to the human eye — realistic backgrounds, real-looking clothing, plausible settings, even sensor-like grain. "It looks like a real photo" is NOT evidence that it is real. Scammers specifically use the BEST generators. Your job is to be sceptical, not reassured. When you are genuinely unsure between "real but heavily filtered" and "AI-generated", treat that ambiguity itself as a red flag and score it HIGH — a heavy beauty filter and AI generation are often indistinguishable, and both are common in scam profiles.

Look hard for AI / manipulation tells (any ONE of these is significant):
- Skin that is poreless, waxy, airbrushed, or unnaturally uniform in tone; no fine lines, blemishes, or real texture
- Faces that are too symmetrical, or features that are subtly "too perfect" (flawless even teeth, idealised proportions)
- Eyes: mismatched catchlights, slightly different shapes/sizes, glassy or plastic-looking irises
- Hair: strands that merge into skin or background, soft/blurred hairline, an over-groomed "rendered" look
- Accessories: asymmetric or mismatched earrings, warped jewellery, melted glasses, garbled logos/text
- Background: too-smooth bokeh, warped or nonsensical objects/text, repeated textures, edges where hair/shoulders "melt" into the background
- Lighting that is overly aesthetic/studio-perfect on a supposedly casual selfie; gradients that are too clean; absence of natural sensor noise
- Hands/fingers with wrong counts or proportions

Also assess: stock/commercial signs (studio polish, modelling pose, watermark); whether a human face is clearly visible; and any compositing or face-swap signs.

Be precise and direct — name the exact artifact and where it is. Do not soften with "appears to be".

Respond with exactly this JSON:
{
  "faceDetected": true or false,
  "aiSigns": ["specific artifact description", ...],
  "stockPhotoSigns": ["specific sign", ...],
  "claudeAiScore": 0-100,
  "assessment": "1-2 sentence direct assessment of this specific image",
  "summary": "Plain-English one-sentence verdict a non-technical person can understand",
  "advice": ["Concrete action 1", "Concrete action 2", ...]
}

claudeAiScore calibration (BE STRICT):
- 0–20: clearly a candid real photo with natural imperfections (visible pores/texture, asymmetry, real-world clutter, ordinary lighting)
- 30–50: a real photo but with noticeable beauty-filter or heavy editing
- 55–77: SEVERAL AI-consistent traits present (e.g. poreless skin + high symmetry + too-clean background) — treat as probably AI
- 78–100: clear AI artifacts, or the unmistakable polished "AI aesthetic", even if no single artifact is obvious
If the face is very smooth/flawless AND the overall image has that polished generated look, score at least 70 even when you cannot point to a single hard artifact.

advice: 2–4 concrete next steps. If suspicious, include "Request a live video call" and "Do your own reverse image search".`;

const CLAUDE_SCHEMA = {
  type: "object",
  properties: {
    faceDetected: { type: "boolean" },
    aiSigns: { type: "array", items: { type: "string" } },
    stockPhotoSigns: { type: "array", items: { type: "string" } },
    claudeAiScore: { type: "integer" },
    assessment: { type: "string" },
    summary: { type: "string" },
    advice: { type: "array", items: { type: "string" } },
  },
  required: [
    "faceDetected",
    "aiSigns",
    "stockPhotoSigns",
    "claudeAiScore",
    "assessment",
    "summary",
    "advice",
  ],
  additionalProperties: false,
} as const;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!client) client = new Anthropic();
  return client;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { image } = (body ?? {}) as {
    image?: { media_type?: unknown; data?: unknown };
  };

  if (!image || typeof image !== "object") {
    return NextResponse.json({ error: "Provide an image to verify." }, { status: 400 });
  }

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

  try {
    const userId = await getUserId();
    const ip = getClientIp(request);
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const identifierType: "ip" | "user" = userId ? "user" : "ip";
    const tier: Tier = await getTierForUser(userId);

    // Photo / identity verification is a paid feature.
    if (tier === "free") {
      return NextResponse.json(
        {
          error: "Photo & identity checks are a Pro feature.",
          requiresUpgrade: true,
        },
        { status: 403 },
      );
    }

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

    // Run external checks in parallel while Claude analyses the image
    const [reverseImageResult, aiDetectionResult, claudeResponse] = await Promise.all([
      reverseImageSearch(data),
      aiGeneratedCheck(data, media_type),
      getClient().messages.create({
        model: MODELS[tier],
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        output_config: {
          format: { type: "json_schema", schema: CLAUDE_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: media_type as ImageMediaType,
                  data,
                },
              },
              {
                type: "text",
                text: "Analyse this profile photo and determine if it shows a real person or is AI-generated / fake.",
              },
            ],
          },
        ],
      }),
    ]);

    const textBlock = claudeResponse.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No analysis returned by the model");
    }

    const claudeAnalysis = JSON.parse(textBlock.text) as {
      faceDetected: boolean;
      aiSigns: string[];
      stockPhotoSigns: string[];
      claudeAiScore: number;
      assessment: string;
      summary: string;
      advice: string[];
    };

    const reverseImage = reverseImageResult.data;
    const aiDetection = aiDetectionResult.data;

    const realScore = computeRealScore({
      faceDetected: claudeAnalysis.faceDetected,
      reverseImage,
      aiDetection,
      claudeAiScore: claudeAnalysis.claudeAiScore,
    });

    const verdict = scoreToVerdict(realScore);

    // Collect all flags from every source
    const flags: string[] = [
      ...(reverseImage?.flags ?? []),
      ...(aiDetection?.flags ?? []),
      ...claudeAnalysis.aiSigns,
      ...claudeAnalysis.stockPhotoSigns,
    ].filter(Boolean);

    if (!claudeAnalysis.faceDetected) {
      flags.unshift("No human face detected in this image");
    }

    const result: PersonVerificationResult = {
      faceDetected: claudeAnalysis.faceDetected,
      reverseImage,
      aiDetection,
      claudeAnalysis: {
        ...claudeAnalysis,
        // keep aiSigns + stockPhotoSigns separate for the card to render
      },
      realScore,
      verdict,
      flags,
      summary: claudeAnalysis.summary,
      advice: claudeAnalysis.advice,
    };

    await recordCheck({
      identifier,
      identifierType,
      tier,
      riskLevel: verdict === "likely_real" ? "safe" : verdict === "suspicious" ? "suspicious" : "likely_scam",
      detectedType: "profile photo",
      summary: claudeAnalysis.summary,
    });

    return NextResponse.json({
      ...result,
      _debug: {
        visionKeySet: !!process.env.GOOGLE_CLOUD_VISION_KEY,
        sightengineSet: !!(process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET),
        reverseImageRan: reverseImage !== null,
        reverseImageError: reverseImageResult.error,
        aiDetectionRan: aiDetection !== null,
        aiDetectionError: aiDetectionResult.error,
      },
    });
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
    console.error("Unexpected error in verify-person:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
