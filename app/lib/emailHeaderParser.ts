export interface ParsedSender {
  displayName: string;
  email: string;
  domain: string;
}

export interface AuthResults {
  spf: "pass" | "fail" | "softfail" | "neutral" | "none" | null;
  dkim: "pass" | "fail" | null;
  dmarc: "pass" | "fail" | null;
}

export interface EmailHeaderAnalysis {
  subject: string | null;
  from: ParsedSender | null;
  replyTo: ParsedSender | null;
  returnPath: ParsedSender | null;
  auth: AuthResults | null;
  receivedCount: number;
  xOriginatingIp: string | null;
  flags: string[];
  /** Formatted string prepended to the Claude prompt as hard-signal context. */
  signals: string;
}

// Brand keyword → legitimate sending domains
// If the display name contains the brand but the domain isn't in the list → impersonation
const BRAND_DOMAINS: Record<string, string[]> = {
  paypal: ["paypal.com", "paypal.co.uk", "paypal.de", "paypal.fr"],
  amazon: ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.com.au", "amazon.de"],
  "amazon prime": ["amazon.com", "amazon.co.uk"],
  hmrc: ["hmrc.gov.uk"],
  "her majesty": ["hmrc.gov.uk", "gov.uk"],
  microsoft: ["microsoft.com", "outlook.com", "hotmail.com", "live.com", "office.com", "xbox.com"],
  apple: ["apple.com", "icloud.com"],
  google: ["google.com", "google.co.uk", "gmail.com", "googlemail.com"],
  facebook: ["facebook.com", "fb.com", "meta.com"],
  instagram: ["instagram.com"],
  netflix: ["netflix.com"],
  spotify: ["spotify.com"],
  lloyds: ["lloydsbank.com", "lloyds.com"],
  barclays: ["barclays.co.uk", "barclays.com"],
  hsbc: ["hsbc.co.uk", "hsbc.com"],
  natwest: ["natwest.com"],
  halifax: ["halifax.co.uk"],
  santander: ["santander.co.uk", "santander.com"],
  nationwide: ["nationwide.co.uk"],
  "royal mail": ["royalmail.com"],
  dvla: ["dvla.gov.uk"],
  nhs: ["nhs.uk", "nhs.net"],
  ebay: ["ebay.com", "ebay.co.uk"],
  dhl: ["dhl.com", "dhl.co.uk"],
  evri: ["evri.com"],
  "royal bank": ["rbs.co.uk", "natwest.com"],
  stripe: ["stripe.com"],
  coinbase: ["coinbase.com"],
  binance: ["binance.com"],
};

function unfoldHeaders(raw: string): string {
  // RFC 2822 header folding: CRLF followed by whitespace is a continuation
  return raw.replace(/\r?\n([ \t]+)/g, " ");
}

function parseSender(raw: string | null): ParsedSender | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "<>") return { displayName: "", email: "<>", domain: "" };

  // "Display Name <email@domain>" — name may be quoted
  const angleMatch = trimmed.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    const displayName = angleMatch[1].trim().replace(/^["']+|["']+$/g, "");
    const email = angleMatch[2].trim().toLowerCase();
    const domain = email.includes("@") ? (email.split("@")[1] ?? "") : "";
    return { displayName, email, domain };
  }

  // Bare email address
  const emailMatch = trimmed.match(/[\w.+\-]+@[\w.\-]+\.[a-z]{2,}/i);
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    const domain = email.split("@")[1] ?? "";
    return { displayName: "", email, domain };
  }

  return null;
}

function parseAuthResults(raw: string): AuthResults {
  const extract = (key: string): string | null => {
    const m = raw.match(new RegExp(`\\b${key}=(\\w+)`, "i"));
    return m?.[1]?.toLowerCase() ?? null;
  };
  return {
    spf: extract("spf") as AuthResults["spf"],
    dkim: extract("dkim") as AuthResults["dkim"],
    dmarc: extract("dmarc") as AuthResults["dmarc"],
  };
}

export function parseEmailHeaders(raw: string): EmailHeaderAnalysis {
  const unfolded = unfoldHeaders(raw);

  // Only process up to the first blank line (headers end there)
  const headerSection = unfolded.split(/\r?\n\r?\n/)[0] ?? unfolded;

  // Build header map — names lowercased, multiple values kept
  const headers = new Map<string, string[]>();
  for (const line of headerSection.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!headers.has(name)) headers.set(name, []);
    headers.get(name)!.push(value);
  }

  const get = (name: string) => headers.get(name)?.[0] ?? null;
  const getAll = (name: string) => headers.get(name) ?? [];

  const from = parseSender(get("from"));
  const replyTo = parseSender(get("reply-to"));
  const returnPath = parseSender(get("return-path"));
  const subject = get("subject");
  const receivedCount = getAll("received").length;
  const xOriginatingIp =
    get("x-originating-ip")?.replace(/[[\]\s]/g, "") ?? null;

  // Combine all Authentication-Results headers
  const authRaw = getAll("authentication-results").join(" ");
  const auth = authRaw ? parseAuthResults(authRaw) : null;

  const flags: string[] = [];

  // 1. SPF failure
  if (auth?.spf === "fail") {
    flags.push(
      `SPF FAIL — email was NOT sent from ${from?.domain ?? "the claimed domain"}, meaning it is likely spoofed`,
    );
  } else if (auth?.spf === "softfail") {
    flags.push(
      `SPF SOFTFAIL — sending server is not authorised to send on behalf of ${from?.domain ?? "this domain"}`,
    );
  }

  // 2. DKIM failure
  if (auth?.dkim === "fail") {
    flags.push(
      "DKIM FAIL — the email's cryptographic signature is invalid, meaning it may have been tampered with in transit",
    );
  }

  // 3. DMARC failure
  if (auth?.dmarc === "fail") {
    flags.push(
      `DMARC FAIL — ${from?.domain ?? "the sender domain"} has a policy that marks this email as fraudulent`,
    );
  }

  // 4. Reply-To mismatch — classic phishing technique
  if (replyTo && from && replyTo.domain && from.domain && replyTo.domain !== from.domain) {
    flags.push(
      `Reply-To mismatch — the From address is ${from.email} but replies will go to ${replyTo.email} (a different domain). This is a classic phishing technique.`,
    );
  }

  // 5. Return-Path mismatch
  if (
    returnPath &&
    from &&
    returnPath.email !== "<>" &&
    returnPath.domain &&
    from.domain &&
    returnPath.domain !== from.domain
  ) {
    flags.push(
      `Return-Path domain (${returnPath.domain}) does not match From domain (${from.domain})`,
    );
  }

  // 6. Brand impersonation — display name claims to be a major brand but domain doesn't match
  if (from) {
    const displayLower = from.displayName.toLowerCase();
    for (const [brand, legitimateDomains] of Object.entries(BRAND_DOMAINS)) {
      if (displayLower.includes(brand)) {
        const isLegit = legitimateDomains.some(
          (d) => from.domain === d || from.domain.endsWith("." + d),
        );
        if (!isLegit && from.domain) {
          flags.push(
            `Brand impersonation — display name claims to be "${from.displayName}" but the actual sending domain is "${from.domain}", which is NOT an official ${brand.toUpperCase()} domain`,
          );
        }
        break;
      }
    }
  }

  // 7. Unusual relay chain
  if (receivedCount > 7) {
    flags.push(
      `${receivedCount} email relay hops — unusually long delivery chain for a legitimate email`,
    );
  }

  // Build context string for Claude
  const lines = [
    "EMAIL HEADER ANALYSIS (hard technical signals):",
    `  From:        ${from ? `${from.displayName} <${from.email}>` : "unknown"}`,
    `  Reply-To:    ${replyTo ? replyTo.email : "not present"}`,
    `  Return-Path: ${returnPath ? returnPath.email : "not present"}`,
    `  Subject:     ${subject ?? "unknown"}`,
    `  SPF:         ${auth?.spf ?? "not checked"}`,
    `  DKIM:        ${auth?.dkim ?? "not checked"}`,
    `  DMARC:       ${auth?.dmarc ?? "not checked"}`,
    `  Relay hops:  ${receivedCount}`,
  ];

  if (flags.length > 0) {
    lines.push("", "AUTHENTICATION RED FLAGS FOUND:");
    for (const f of flags) lines.push(`  • ${f}`);
  } else if (auth) {
    lines.push("", "All authentication checks passed — no spoofing signals detected.");
  }

  return {
    subject,
    from,
    replyTo,
    returnPath,
    auth,
    receivedCount,
    xOriginatingIp,
    flags,
    signals: lines.join("\n"),
  };
}

/** Returns true if a string looks like it contains email headers. */
export function looksLikeEmailHeaders(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("received:") ||
    lower.includes("mime-version:") ||
    (lower.includes("from:") && lower.includes("subject:") && lower.includes("to:"))
  );
}
