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

/** Find and check phone numbers in text (up to 2). */
export async function checkPhonesInText(text: string): Promise<PhoneCheck[]> {
  // v2:true returns NumberFound (with PhoneNumber object); GB default parses UK-local numbers.
  const found = findNumbers(text, { defaultCountry: "GB", v2: true }).slice(0, 2);
  if (found.length === 0) return [];

  return Promise.all(
    found.map(async ({ number: phone, startsAt, endsAt }) => {
      const raw = text.slice(startsAt, endsAt);
      const e164 = phone.format("E.164");
      const type = phone.getType();
      const countryCode = phone.country ?? null;
      const flags = heuristicFlags(type, countryCode);
      const carrier = await carrierLookup(e164);

      return {
        raw,
        e164,
        display: phone.formatInternational(),
        valid: true,
        countryCode,
        countryName: countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null,
        lineType: type ? (LINE_TYPE_LABELS[type] ?? type) : null,
        carrier,
        flags,
      } satisfies PhoneCheck;
    }),
  );
}

/** Compact summary for the Claude prompt. */
export function describePhoneChecks(checks: PhoneCheck[]): string {
  if (checks.length === 0) return "";
  const lines = checks.map((c) => {
    const parts = [
      c.display ?? c.raw,
      c.countryName ? `country: ${c.countryName}` : null,
      c.lineType ? `line type: ${c.lineType}` : null,
      c.carrier ? `carrier: ${c.carrier}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const signals = c.flags.length ? c.flags.join("; ") : "no automated signals";
    return `- ${parts}; signals: ${signals}`;
  });
  return `Automated phone checks (factual signals — weigh these in your verdict):\n${lines.join("\n")}`;
}
