export interface WebPageMatch {
  url: string;
  title: string | null;
}

export interface ReverseImageResult {
  matchCount: number;
  exactMatchCount: number;
  topMatches: WebPageMatch[];
  webEntities: string[];
  bestGuessLabel: string | null;
  flags: string[];
}

export interface AiDetectionResult {
  /** Sightengine score: 0.0–1.0, where 1 = very likely AI-generated. */
  aiScore: number;
  flags: string[];
}

export interface ClaudeVisualAnalysis {
  faceDetected: boolean;
  /** Specific AI artifacts Claude spotted (e.g. "blurry ear edges"). */
  aiSigns: string[];
  /** Signs of a professional/stock photo (studio lighting, pose, etc.). */
  stockPhotoSigns: string[];
  /** 0–100: 0 = clearly a real personal photo, 100 = clearly AI-generated. */
  claudeAiScore: number;
  /** 1–2 sentence assessment of this specific image. */
  assessment: string;
  summary: string;
  advice: string[];
}

export interface PersonVerificationResult {
  faceDetected: boolean;
  reverseImage: ReverseImageResult | null;
  aiDetection: AiDetectionResult | null;
  claudeAnalysis: ClaudeVisualAnalysis;
  /** 0–100: 100 = almost certainly a real person, 0 = almost certainly fake. */
  realScore: number;
  verdict: "likely_real" | "suspicious" | "likely_fake";
  flags: string[];
  summary: string;
  advice: string[];
}

const STOCK_DOMAINS = [
  "shutterstock.com",
  "gettyimages.com",
  "istockphoto.com",
  "alamy.com",
  "dreamstime.com",
  "depositphotos.com",
  "123rf.com",
  "stock.adobe.com",
  "unsplash.com",
  "pexels.com",
  "freepik.com",
];

const AI_GENERATOR_DOMAINS = [
  "thispersondoesnotexist.com",
  "generated.photos",
  "midjourney.com",
  "nightcafe.studio",
  "artbreeder.com",
  "stablediffusionweb.com",
  "playgroundai.com",
  "lexica.art",
  "civitai.com",
];

export async function reverseImageSearch(
  base64: string,
): Promise<{ data: ReverseImageResult | null; error: string | null }> {
  const key = process.env.GOOGLE_CLOUD_VISION_KEY;
  if (!key) return { data: null, error: "GOOGLE_CLOUD_VISION_KEY not set" };

  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "WEB_DETECTION", maxResults: 20 }],
            },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const msg = `Vision HTTP ${res.status}: ${errBody.slice(0, 200)}`;
      console.error("[Vision]", msg);
      return { data: null, error: msg };
    }
    const data = (await res.json()) as Record<string, unknown>;
    const responses = data.responses as Array<Record<string, unknown>>;
    const wd = responses?.[0]?.webDetection as Record<string, unknown> | undefined;
    if (!wd) return { data: null, error: "Vision returned no webDetection" };

    const pages = (wd.pagesWithMatchingImages as Array<Record<string, string>>) ?? [];
    const fullMatches = (wd.fullMatchingImages as Array<Record<string, string>>) ?? [];
    const rawEntities = (wd.webEntities as Array<{ description?: string; score?: number }>) ?? [];

    const webEntities = rawEntities
      .filter((e) => (e.score ?? 0) > 0.5 && e.description)
      .map((e) => e.description as string)
      .slice(0, 5);

    const bestGuessLabels = wd.bestGuessLabels as Array<{ label?: string }> | undefined;
    const bestGuessLabel = bestGuessLabels?.[0]?.label ?? null;

    const flags: string[] = [];

    const topMatches: WebPageMatch[] = pages.slice(0, 8).map((p) => ({
      url: p.url ?? "",
      title: p.pageTitle ?? null,
    }));

    const stockMatches = pages.filter((p) =>
      STOCK_DOMAINS.some((d) => p.url?.includes(d)),
    );
    if (stockMatches.length > 0) {
      flags.push(
        `Found on ${stockMatches.length} stock photo site(s) — this is a stolen commercial photo`,
      );
    }

    const aiMatches = pages.filter((p) =>
      AI_GENERATOR_DOMAINS.some((d) => p.url?.includes(d)),
    );
    if (aiMatches.length > 0) {
      flags.push(
        `Image appears on AI image generator platform(s) — very strong indicator of a synthetic face`,
      );
    }

    if (fullMatches.length > 12) {
      flags.push(
        `${fullMatches.length} exact copies of this image found across the web — extremely high reuse for a personal photo`,
      );
    } else if (fullMatches.length > 5) {
      flags.push(
        `${fullMatches.length} exact copies of this image found online — suggests a fake profile photo`,
      );
    }

    const socialDomains = [
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "x.com",
      "tiktok.com",
      "pinterest.com",
      "linkedin.com",
    ];
    const socialMatches = pages.filter((p) =>
      socialDomains.some((d) => p.url?.includes(d)),
    );
    if (socialMatches.length >= 6) {
      flags.push(
        `Photo found on ${socialMatches.length} different social media profiles — widely-circulated image typical of scammer profile photos`,
      );
    }

    return {
      data: {
        matchCount: pages.length,
        exactMatchCount: fullMatches.length,
        topMatches,
        webEntities,
        bestGuessLabel,
        flags,
      },
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Vision] fetch error:", msg);
    return { data: null, error: `Vision fetch threw: ${msg}` };
  }
}

export async function aiGeneratedCheck(
  base64: string,
  mimeType: string,
): Promise<{ data: AiDetectionResult | null; error: string | null }> {
  const apiUser = process.env.SIGHTENGINE_USER;
  const apiSecret = process.env.SIGHTENGINE_SECRET;
  if (!apiUser || !apiSecret) return { data: null, error: "SIGHTENGINE_USER or SIGHTENGINE_SECRET not set" };

  try {
    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append("api_user", apiUser);
    formData.append("api_secret", apiSecret);
    formData.append("models", "genai");
    formData.append("media", blob, "photo.jpg");

    const res = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const msg = `Sightengine HTTP ${res.status}: ${errBody.slice(0, 200)}`;
      console.error("[Sightengine]", msg);
      return { data: null, error: msg };
    }
    const data = (await res.json()) as {
      status: string;
      error?: { type?: string; message?: string };
      type?: { ai_generated?: number };
    };
    if (data.status !== "success") {
      const msg = `Sightengine status=${data.status} error=${JSON.stringify(data.error)}`;
      console.error("[Sightengine]", msg);
      return { data: null, error: msg };
    }

    // genai model returns a 0–1 score at type.ai_generated (1 = very likely AI).
    const aiScore = data.type?.ai_generated ?? 0;
    const flags: string[] = [];

    if (aiScore >= 0.85) {
      flags.push(
        `Sightengine AI detector: ${Math.round(aiScore * 100)}% confidence this is AI-generated`,
      );
    } else if (aiScore >= 0.55) {
      flags.push(
        `Sightengine AI detector: ${Math.round(aiScore * 100)}% probability of AI-generated image`,
      );
    }

    return { data: { aiScore, flags }, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Sightengine] fetch error:", msg);
    return { data: null, error: `Sightengine fetch threw: ${msg}` };
  }
}

export function computeRealScore(params: {
  faceDetected: boolean;
  reverseImage: ReverseImageResult | null;
  aiDetection: AiDetectionResult | null;
  claudeAiScore: number;
}): number {
  const { faceDetected, reverseImage, aiDetection, claudeAiScore } = params;

  let score = 82;

  if (!faceDetected) score -= 35;

  // Sightengine score — a strong hard signal (0–50 penalty). But top-tier
  // generators can fool it (return ~0), so it can't be the only line of defence.
  if (aiDetection) score -= Math.round(aiDetection.aiScore * 50);

  // Claude visual judgement — weighted heavily (0–45) precisely because it's the
  // backstop when a good generator slips past Sightengine.
  score -= Math.round((claudeAiScore / 100) * 45);

  if (reverseImage) {
    if (reverseImage.flags.some((f) => f.includes("AI image generator"))) score -= 45;
    if (reverseImage.flags.some((f) => f.includes("stock photo"))) score -= 40;
    if (reverseImage.flags.some((f) => f.includes("exact copies"))) score -= 25;
    if (reverseImage.flags.some((f) => f.includes("social media profiles"))) score -= 20;
  }

  // A confident AI verdict from EITHER detector forces a fail. Modern generators
  // can beat one detector but rarely both, and a false "real" is the costly error.
  const strongAi = claudeAiScore >= 78 || (aiDetection?.aiScore ?? 0) >= 0.6;
  if (strongAi) score = Math.min(score, 22);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreToVerdict(
  realScore: number,
): "likely_real" | "suspicious" | "likely_fake" {
  if (realScore >= 70) return "likely_real";
  if (realScore >= 42) return "suspicious";
  return "likely_fake";
}
