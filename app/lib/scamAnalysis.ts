import Anthropic from "@anthropic-ai/sdk";

export type RiskLevel = "safe" | "suspicious" | "likely_scam";

export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export interface UrlCheck {
  url: string;
  host: string;
  /** Domain age in days from RDAP, or null if unknown. */
  domainAgeDays: number | null;
  registeredOn: string | null;
  flags: string[];
  /** Threat types returned by Google Safe Browsing, e.g. ["MALWARE", "SOCIAL_ENGINEERING"]. */
  safeBrowsingThreats?: string[];
}

export interface PhoneCheck {
  /** Raw text as found in the input. */
  raw: string;
  /** E.164 normalised number, e.g. "+447911123456". */
  e164: string;
  /** Human-readable formatted number. */
  display: string;
  valid: boolean;
  countryCode: string | null;
  countryName: string | null;
  /** Line type: "Mobile", "VoIP", "Premium rate", etc. */
  lineType: string | null;
  /** Carrier name from AbstractAPI or IPQS (if key set). */
  carrier: string | null;
  /** IPQS fraud score 0–100 (higher = more likely spam/fraud). Null if IPQS key not set. */
  spamScore: number | null;
  /** IPQS: number has been reported for recent abuse. */
  recentAbuse: boolean;
  flags: string[];
}

export interface Verdict {
  /** Overall risk classification. */
  risk_level: RiskLevel;
  /** Confidence in the verdict, 0–100. */
  confidence: number;
  /** What ScamShield judged the content to be, e.g. "SMS message", "URL". */
  detected_type: string;
  /** One-sentence plain-English summary of the verdict. */
  summary: string;
  /** Specific warning signs found in the content. Empty if none. */
  red_flags: string[];
  /** Plain-English explanation of the reasoning. */
  explanation: string;
  /** Recommended next steps for the user. */
  advice: string[];
  /** Hard-signal link reputation checks, added by the API (not the model). */
  link_checks?: UrlCheck[];
  /** Hard-signal phone reputation checks, added by the API (not the model). */
  phone_checks?: PhoneCheck[];
  /** Community-reported matches for any domain or phone found in the input. */
  community_reports?: CommunityMatch[];
}

export interface CommunityMatch {
  inputType: "domain" | "phone" | "email";
  inputValue: string;
  reportCount: number;
  source: string;
  sourceLabel: string | null;
  lastReported: string;
}

/** Subscription tier — drives which model handles the check. */
export type Tier = "free" | "pro" | "unlimited";

export interface AnalyzeInput {
  text?: string;
  image?: { media_type: ImageMediaType; data: string }; // data is base64, no prefix
  /** Defaults to "free". */
  tier?: Tier;
  /** Factual link-reputation findings appended to the prompt. */
  linkContext?: string;
}

// Free/basic checks run on the cheaper, fast Haiku model (~0.3c/check); paid
// tiers get Sonnet for the full, more nuanced breakdown (~1c/check).
const MODELS: Record<Tier, string> = {
  free: "claude-haiku-4-5",
  pro: "claude-sonnet-4-6",
  unlimited: "claude-sonnet-4-6",
};

const SYSTEM_PROMPT = `You are ScamShield, an expert fraud and scam detection analyst. \
Users paste or upload anything they're unsure about — a text message, an email, a \
phone number, a URL, or a screenshot — and you assess whether it is a scam.

Auto-detect what the content is, then judge it. Consider common scam signals: \
urgency and pressure tactics, requests for money/gift cards/crypto, requests for \
personal or financial details, impersonation of banks/government/delivery firms/\
well-known brands, lookalike or mismatched domains, suspicious links, poor grammar \
inconsistent with the claimed sender, too-good-to-be-true offers, and unsolicited contact.

Be accurate and proportionate. Do not cry wolf at legitimate messages, but flag \
genuine danger clearly. If the content is harmless, say so plainly.

Risk levels:
- "safe": no meaningful scam indicators.
- "suspicious": some warning signs, treat with caution.
- "likely_scam": strong indicators this is a scam.

Write for an ordinary, non-technical person. Keep the summary to one sentence. \
Make advice concrete and actionable.`;

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    risk_level: {
      type: "string",
      enum: ["safe", "suspicious", "likely_scam"],
      description: "Overall risk classification.",
    },
    confidence: {
      type: "integer",
      description: "Confidence in the verdict from 0 to 100.",
    },
    detected_type: {
      type: "string",
      description:
        'What the content appears to be, e.g. "SMS message", "email", "URL", "phone number", "screenshot".',
    },
    summary: {
      type: "string",
      description: "A single plain-English sentence summarising the verdict.",
    },
    red_flags: {
      type: "array",
      items: { type: "string" },
      description: "Specific warning signs found. Empty array if none.",
    },
    explanation: {
      type: "string",
      description: "Plain-English explanation of the reasoning behind the verdict.",
    },
    advice: {
      type: "array",
      items: { type: "string" },
      description: "Concrete recommended next steps for the user.",
    },
  },
  required: [
    "risk_level",
    "confidence",
    "detected_type",
    "summary",
    "red_flags",
    "explanation",
    "advice",
  ],
  additionalProperties: false,
} as const;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function analyzeContent(input: AnalyzeInput): Promise<Verdict> {
  const content: Anthropic.ContentBlockParam[] = [];

  if (input.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.media_type,
        data: input.image.data,
      },
    });
  }

  const base = input.text
    ? `Analyse the following content and decide whether it is a scam:\n\n${input.text}`
    : "Analyse the attached image and decide whether it is a scam.";
  content.push({
    type: "text",
    text: input.linkContext ? `${base}\n\n${input.linkContext}` : base,
  });

  const response = await getClient().messages.create({
    model: MODELS[input.tier ?? "free"],
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: VERDICT_SCHEMA },
    },
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No analysis was returned by the model");
  }

  return JSON.parse(textBlock.text) as Verdict;
}
