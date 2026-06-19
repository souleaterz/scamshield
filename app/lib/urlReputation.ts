import type { UrlCheck } from "@/app/lib/scamAnalysis";

// Brands commonly impersonated in UK-facing scams.
const BRANDS = [
  "paypal", "apple", "amazon", "microsoft", "google", "netflix", "hmrc",
  "royalmail", "dpd", "evri", "hermes", "dhl", "fedex", "ups", "nhs",
  "barclays", "hsbc", "lloyds", "natwest", "santander", "monzo", "revolut",
  "halifax", "nationwide", "tesco", "dvla", "tvlicensing", "coinbase",
  "binance", "whatsapp", "instagram", "facebook", "netflix", "ebay",
];

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "rebrand.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc",
]);

// TLDs disproportionately used for abuse / very cheap to register.
const RISKY_TLDS = new Set([
  "zip", "mov", "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click", "link",
  "work", "country", "kim", "loan", "men", "rest", "live", "vip", "club",
]);

const MULTI_LEVEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "com.au", "co.nz",
  "co.za", "com.br", "co.jp",
]);

const URL_RE =
  /((?:https?:\/\/|www\.)[^\s<>"')\]]+|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|uk|info|biz|xyz|top|live|online|site|shop|app|dev|me|tv|cc|link|click|gq|tk|ml|cf|ga|zip|mov|ru|cn|club|vip|work|store)(?:\/[^\s<>"')\]]*)?)/gi;

export function extractUrls(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(URL_RE)) {
    let raw = match[0].replace(/[.,)]+$/, ""); // trim trailing punctuation
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    try {
      const u = new URL(raw);
      found.add(u.href);
    } catch {
      /* skip unparseable */
    }
  }
  return [...found];
}

function registrableDomain(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  if (MULTI_LEVEL_SUFFIXES.has(lastTwo)) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function heuristicFlags(url: URL, host: string): string[] {
  const flags: string[] = [];
  const registrable = registrableDomain(host);
  const sld = registrable.split(".")[0];
  const tld = host.split(".").pop() || "";

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    flags.push("Uses a raw IP address instead of a domain name");
  }
  if (host.startsWith("xn--") || host.includes(".xn--")) {
    flags.push("Internationalised domain that can mimic real brands (punycode)");
  }
  if (SHORTENERS.has(host)) {
    flags.push("Shortened link that hides the real destination");
  }
  if (url.username || url.href.includes("@")) {
    flags.push("Link contains '@', which can disguise the real destination");
  }
  if (url.protocol === "http:") {
    flags.push("Not a secure (https) connection");
  }
  if (RISKY_TLDS.has(tld)) {
    flags.push(`Uses a .${tld} domain, often used for scams`);
  }
  if ((host.match(/-/g) || []).length >= 3) {
    flags.push("Domain has an unusual number of hyphens");
  }
  for (const brand of BRANDS) {
    if (host.includes(brand) && sld !== brand) {
      flags.push(
        `Mentions "${brand}" but isn't an official ${brand} domain — likely impersonation`,
      );
      break;
    }
  }
  return flags;
}

async function domainAge(
  host: string,
): Promise<{ days: number | null; date: string | null }> {
  const registrable = registrableDomain(host);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://rdap.org/domain/${registrable}`, {
      signal: controller.signal,
      headers: { accept: "application/rdap+json" },
    });
    clearTimeout(timer);
    if (!res.ok) return { days: null, date: null };
    const data = (await res.json()) as {
      events?: { eventAction?: string; eventDate?: string }[];
    };
    const reg = data.events?.find((e) => e.eventAction === "registration");
    if (!reg?.eventDate) return { days: null, date: null };
    const date = new Date(reg.eventDate);
    if (Number.isNaN(date.getTime())) return { days: null, date: null };
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    return { days, date: date.toISOString().slice(0, 10) };
  } catch {
    return { days: null, date: null };
  }
}

async function checkUrl(href: string): Promise<UrlCheck> {
  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, "");
  const flags = heuristicFlags(url, host);
  const { days, date } = await domainAge(host);

  if (days !== null && days <= 30) {
    flags.unshift(`Domain registered very recently (${days} days ago)`);
  } else if (days !== null && days <= 90) {
    flags.push(`Domain registered fairly recently (${days} days ago)`);
  }

  return {
    url: href,
    host,
    domainAgeDays: days,
    registeredOn: date,
    flags,
  };
}

/** Run reputation checks on up to 2 URLs found in the text. */
export async function checkUrlsInText(text: string): Promise<UrlCheck[]> {
  const urls = extractUrls(text).slice(0, 2);
  if (urls.length === 0) return [];
  return Promise.all(urls.map((u) => checkUrl(u)));
}

/** A compact, factual summary of the checks to feed into the model prompt. */
export function describeChecks(checks: UrlCheck[]): string {
  if (checks.length === 0) return "";
  const lines = checks.map((c) => {
    const age =
      c.domainAgeDays === null
        ? "registration date unknown"
        : `${c.domainAgeDays} days old (registered ${c.registeredOn})`;
    const signals = c.flags.length ? c.flags.join("; ") : "no automated signals";
    return `- ${c.url} → domain ${c.host}: ${age}; signals: ${signals}`;
  });
  return `Automated link checks (factual signals — weigh these in your verdict):\n${lines.join("\n")}`;
}
