import { findNumbers } from "libphonenumber-js";
import type { PhoneCheck } from "@/app/lib/scamAnalysis";

const LINE_TYPE_LABELS: Record<string, string> = {
  MOBILE: "Mobile",
  FIXED_LINE: "Fixed line",
  FIXED_LINE_OR_MOBILE: "Fixed line or mobile",
  TOLL_FREE: "Toll-free",
  PREMIUM_RATE: "Premium rate",
  SHARED_COST: "Shared cost",
  VOIP: "VoIP",
  PERSONAL_NUMBER: "Personal number",
  PAGER: "Pager",
  UAN: "Universal access",
  VOICEMAIL: "Voicemail",
};

// ISO alpha-2 → display name for common countries.
const COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom", US: "United States", CA: "Canada", AU: "Australia",
  IN: "India", PK: "Pakistan", NG: "Nigeria", GH: "Ghana", ZA: "South Africa",
  PH: "Philippines", RU: "Russia", CN: "China", BR: "Brazil", DE: "Germany",
  FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", RO: "Romania",
  UA: "Ukraine", PL: "Poland", KE: "Kenya", ET: "Ethiopia", EG: "Egypt",
};

function heuristicFlags(type: string | undefined, countryCode: string | null): string[] {
  const flags: string[] = [];
  if (type === "PREMIUM_RATE") {
    flags.push(
      "Premium-rate number — calls are expensive and commonly used in scam callback schemes",
    );
  }
  if (type === "VOIP") {
    flags.push(
      "VoIP number — hides the caller's true location and identity, a common scammer tactic",
    );
  }
  if (type === "PERSONAL_NUMBER") {
    flags.push(
      "Personal number (070xx range in the UK) — often used to appear local while routing calls abroad",
    );
  }
  if (type === "PAGER") {
    flags.push("Pager number — unusual in modern legitimate communications");
  }
  if (type === "SHARED_COST") {
    flags.push("Shared-cost number — caller shares the cost; can be misused to charge unexpected fees");
  }
  // Flag non-UK international numbers (most UK scam content is UK-targeted).
  if (countryCode && countryCode !== "GB") {
    const name = COUNTRY_NAMES[countryCode] ?? countryCode;
    flags.push(`Number is registered in ${name}, not the UK`);
  }
  return flags;
}

async function carrierLookup(e164: string): Promise<string | null> {
  const key = process.env.ABSTRACT_API_PHONE_KEY;
  if (!key) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://phonevalidation.abstractapi.com/v1/?api_key=${key}&phone=${encodeURIComponent(e164)}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { carrier?: string };
    return data.carrier ?? null;
  } catch {
    return null;
  }
}

interface IpqsResult {
  spamScore: number | null;
  recentAbuse: boolean;
  carrier: string | null;
  flags: string[];
}

async function ipqsLookup(e164: string): Promise<IpqsResult> {
  const key = process.env.IPQS_API_KEY;
  const empty: IpqsResult = { spamScore: null, recentAbuse: false, carrier: null, flags: [] };
  if (!key) return empty;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://www.ipqualityscore.com/api/json/phone/${key}/${encodeURIComponent(e164)}?strictness=1`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      success?: boolean;
      fraud_score?: number;
      recent_abuse?: boolean;
      spammer?: boolean;
      risky?: boolean;
      do_not_call?: boolean;
      carrier?: string;
    };
    if (!data.success) return empty;

    const flags: string[] = [];
    const score = data.fraud_score ?? 0;
    if (data.spammer || score >= 85) {
      flags.push(`Reported as a spam or scam caller (fraud score: ${score}/100)`);
    } else if (data.risky || score >= 60) {
      flags.push(`Flagged as potentially risky by reputation database (fraud score: ${score}/100)`);
    }
    if (data.recent_abuse) {
      flags.push("Recent abuse reports associated with this number");
    }
    if (data.do_not_call) {
      flags.push("Listed on Do Not Call registry");
    }

    return {
      spamScore: score,
      recentAbuse: data.recent_abuse ?? false,
      carrier: data.carrier ?? null,
      flags,
    };
  } catch {
    return empty;
  }
}

/**
 * Find phone numbers in text trying multiple country defaults so that
 * local-format numbers from any major country are detected, not just UK.
 * Deduplicates by E.164 — the first parse wins for position metadata.
 */
function findPhoneNumbers(text: string) {
  const seen = new Set<string>();
  const results: ReturnType<typeof findNumbers> = [];
  for (const country of ["GB", "US", "CA", "AU", "IN", "NG", "ZA"] as const) {
    for (const match of findNumbers(text, { defaultCountry: country, v2: true })) {
      const e164 = match.number.format("E.164");
      if (!seen.has(e164)) {
        seen.add(e164);
        results.push(match);
      }
    }
  }
  return results;
}

/** Find and check phone numbers in text (up to 3). */
export async function checkPhonesInText(text: string): Promise<PhoneCheck[]> {
  const found = findPhoneNumbers(text).slice(0, 3);
  if (found.length === 0) return [];

  return Promise.all(
    found.map(async ({ number: phone, startsAt, endsAt }) => {
      const raw = text.slice(startsAt, endsAt);
      const e164 = phone.format("E.164");
      const type = phone.getType();
      const countryCode = phone.country ?? null;
      const heuristics = heuristicFlags(type, countryCode);

      // Carrier lookup and spam reputation run in parallel.
      const [abstractCarrier, ipqs] = await Promise.all([
        carrierLookup(e164),
        ipqsLookup(e164),
      ]);

      return {
        raw,
        e164,
        display: phone.formatInternational(),
        valid: true,
        countryCode,
        countryName: countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null,
        lineType: type ? (LINE_TYPE_LABELS[type] ?? type) : null,
        carrier: ipqs.carrier ?? abstractCarrier,
        spamScore: ipqs.spamScore,
        recentAbuse: ipqs.recentAbuse,
        flags: [...ipqs.flags, ...heuristics],
      } satisfies PhoneCheck;
    }),
  );
}

/** Compact summary for the Claude prompt. */
export function describePhoneChecks(checks: PhoneCheck[]): string {
  if (checks.length === 0) return "";
  const hasSpamData = checks.some((c) => c.spamScore !== null);
  const lines = checks.map((c) => {
    const parts = [
      c.display ?? c.raw,
      c.countryName ? `country: ${c.countryName}` : null,
      c.lineType ? `line type: ${c.lineType}` : null,
      c.carrier ? `carrier: ${c.carrier}` : null,
      c.spamScore !== null ? `spam/fraud score: ${c.spamScore}/100` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const signals = c.flags.length ? c.flags.join("; ") : "no automated signals from available checks";
    return `- ${parts}; signals: ${signals}`;
  });
  const caveat = hasSpamData
    ? ""
    : "\nNOTE: No spam call reputation database is connected — absence of signals does NOT confirm the number is safe. Do not classify phone numbers as 'safe' based on line-type checks alone.";
  return `Automated phone checks (factual signals — weigh these in your verdict):\n${lines.join("\n")}${caveat}`;
}
