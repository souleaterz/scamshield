const CH_BASE = "https://api.company-information.service.gov.uk";
const FCA_BASE = "https://register.fca.org.uk/services/V0.1";

// UK company number formats: 8 digits, or 2-letter prefix + 6 digits (SC, NI, OC, etc.)
const COMPANY_NUMBER_RE = /^[A-Z]{0,2}\d{6,8}$/i;

// FCA FRN: typically 6 digits
const FRN_RE = /^\d{6}$/;

export interface CompaniesHouseCompany {
  companyNumber: string;
  name: string;
  status: string;
  companyType: string;
  incorporatedOn: string | null;
  ageMonths: number | null;
  registeredAddress: string | null;
  sicCodes: string[];
}

export interface FcaFirm {
  frn: string;
  name: string;
  status: string;
  businessType: string | null;
}

export interface CompanyCheckResult {
  query: string;
  companiesHouse: {
    found: boolean;
    company: CompaniesHouseCompany | null;
    searchAttempted: boolean;
    error: string | null;
  };
  fca: {
    found: boolean;
    firm: FcaFirm | null;
    searchAttempted: boolean;
    error: string | null;
  };
  verdict: "legitimate" | "suspicious" | "likely_fraudulent";
  legitimacyScore: number;
  flags: string[];
  positives: string[];
  advice: string[];
}

function chAuthHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY ?? "";
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function ageMonths(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const inc = new Date(dateStr);
  if (isNaN(inc.getTime())) return null;
  const now = new Date();
  return (
    (now.getFullYear() - inc.getFullYear()) * 12 +
    (now.getMonth() - inc.getMonth())
  );
}

function formatAddress(addr: Record<string, unknown> | null): string | null {
  if (!addr) return null;
  const parts = [
    addr["address_line_1"],
    addr["address_line_2"],
    addr["locality"],
    addr["postal_code"],
    addr["country"],
  ].filter(Boolean);
  return parts.length ? (parts as string[]).join(", ") : null;
}

async function lookupCompaniesHouse(query: string): Promise<CompanyCheckResult["companiesHouse"]> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    return { found: false, company: null, searchAttempted: false, error: "COMPANIES_HOUSE_API_KEY not configured" };
  }

  const trimmed = query.trim().replace(/\s+/g, " ");
  const isNumber = COMPANY_NUMBER_RE.test(trimmed.replace(/\s/g, ""));
  const auth = chAuthHeader();

  try {
    let profileData: Record<string, unknown> | null = null;

    if (isNumber) {
      const num = trimmed.replace(/\s/g, "").toUpperCase();
      const res = await fetch(`${CH_BASE}/company/${num}`, {
        headers: { Authorization: auth },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        profileData = await res.json();
      } else if (res.status !== 404) {
        return { found: false, company: null, searchAttempted: true, error: `Companies House API error: ${res.status}` };
      }
    } else {
      const res = await fetch(
        `${CH_BASE}/search/companies?q=${encodeURIComponent(trimmed)}&items_per_page=1`,
        { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) {
        return { found: false, company: null, searchAttempted: true, error: `Companies House search error: ${res.status}` };
      }
      const data: { items?: unknown[] } = await res.json();
      if (!data.items?.length) {
        return { found: false, company: null, searchAttempted: true, error: null };
      }
      const hit = data.items[0] as Record<string, unknown>;
      // Fetch full profile for the top result
      const compNum = String(hit["company_number"] ?? "");
      if (compNum) {
        const profileRes = await fetch(`${CH_BASE}/company/${compNum}`, {
          headers: { Authorization: auth },
          signal: AbortSignal.timeout(8000),
        });
        if (profileRes.ok) profileData = await profileRes.json();
        else profileData = hit;
      } else {
        profileData = hit;
      }
    }

    if (!profileData) return { found: false, company: null, searchAttempted: true, error: null };

    const incDate = (profileData["date_of_creation"] as string | null) ?? null;
    const company: CompaniesHouseCompany = {
      companyNumber: String(profileData["company_number"] ?? ""),
      name: String(profileData["company_name"] ?? profileData["title"] ?? ""),
      status: String(profileData["company_status"] ?? "unknown"),
      companyType: String(profileData["type"] ?? profileData["company_type"] ?? ""),
      incorporatedOn: incDate,
      ageMonths: ageMonths(incDate),
      registeredAddress: formatAddress(
        (profileData["registered_office_address"] as Record<string, unknown> | null) ??
        (profileData["address"] as Record<string, unknown> | null),
      ),
      sicCodes: Array.isArray(profileData["sic_codes"])
        ? (profileData["sic_codes"] as string[])
        : [],
    };

    return { found: true, company, searchAttempted: true, error: null };
  } catch (err) {
    return {
      found: false,
      company: null,
      searchAttempted: true,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function lookupFca(query: string): Promise<CompanyCheckResult["fca"]> {
  const trimmed = query.trim();

  try {
    // If it looks like an FRN, try direct lookup first
    const isFrn = FRN_RE.test(trimmed.replace(/\s/g, ""));
    let url: string;
    if (isFrn) {
      url = `${FCA_BASE}/Firm/${trimmed.replace(/\s/g, "")}`;
    } else {
      url = `${FCA_BASE}/Search?q=${encodeURIComponent(trimmed)}&type=firm`;
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // 404 means not found — not an error
      if (res.status === 404) return { found: false, firm: null, searchAttempted: true, error: null };
      return { found: false, firm: null, searchAttempted: true, error: `FCA API error: ${res.status}` };
    }

    const data: Record<string, unknown> = await res.json();

    // Direct FRN lookup returns a single firm object; search returns { Data: [...] }
    let firmData: Record<string, unknown> | null = null;
    if (isFrn && data["FRN"]) {
      firmData = data;
    } else {
      const list = (data["Data"] ?? data["data"] ?? []) as unknown[];
      if (!list.length) return { found: false, firm: null, searchAttempted: true, error: null };
      firmData = list[0] as Record<string, unknown>;
    }

    if (!firmData) return { found: false, firm: null, searchAttempted: true, error: null };

    const firm: FcaFirm = {
      frn: String(
        firmData["FRN"] ??
        firmData["Individual Reference Number"] ??
        firmData["frn"] ??
        "",
      ),
      name: String(
        firmData["Organisation Name"] ??
        firmData["organisation_name"] ??
        firmData["Name"] ??
        "",
      ),
      status: String(
        firmData["Status"] ??
        firmData["status"] ??
        "",
      ),
      businessType: String(
        firmData["Business Type"] ??
        firmData["business_type"] ??
        firmData["BusinessType"] ??
        "",
      ) || null,
    };

    return { found: true, firm, searchAttempted: true, error: null };
  } catch (err) {
    return {
      found: false,
      firm: null,
      searchAttempted: true,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

const STATUS_ORDER = ["dissolved", "converted-closed", "removed", "liquidation", "insolvency-proceedings", "administration", "voluntary-arrangement"];

function scoreAndVerdict(
  ch: CompanyCheckResult["companiesHouse"],
  fca: CompanyCheckResult["fca"],
): Pick<CompanyCheckResult, "legitimacyScore" | "verdict" | "flags" | "positives" | "advice"> {
  let score = 50;
  const flags: string[] = [];
  const positives: string[] = [];

  if (ch.searchAttempted) {
    if (ch.found && ch.company) {
      const st = ch.company.status.toLowerCase();
      if (st === "active") {
        score += 25;
        positives.push(`Active and registered at Companies House (${ch.company.companyNumber})`);
        if (ch.company.ageMonths !== null && ch.company.ageMonths >= 60) {
          score += 5;
          positives.push(`Established company — ${Math.floor(ch.company.ageMonths / 12)} years old`);
        }
      } else if (["dissolved", "converted-closed", "removed"].includes(st)) {
        score -= 35;
        flags.push(`Company is ${ch.company.status} — it no longer exists as a legal entity`);
      } else if (STATUS_ORDER.slice(3).some((s) => st.includes(s.split("-")[0]))) {
        score -= 40;
        flags.push(`Company is in ${ch.company.status} — it is being wound up or is insolvent`);
      }

      if (ch.company.ageMonths !== null) {
        if (ch.company.ageMonths < 3) {
          score -= 25;
          flags.push(
            `Company formed only ${ch.company.ageMonths === 0 ? "less than a month" : `${ch.company.ageMonths} month${ch.company.ageMonths === 1 ? "" : "s"}`} ago — extremely new`,
          );
        } else if (ch.company.ageMonths < 12) {
          score -= 10;
          flags.push(`Company formed ${ch.company.ageMonths} months ago — less than a year old`);
        }
      }
    } else if (!ch.found) {
      score -= 15;
      flags.push("Not found in the Companies House register — no UK company matches this name or number");
    }
  }

  if (fca.searchAttempted) {
    if (fca.found && fca.firm) {
      const st = fca.firm.status.toLowerCase();
      if (st === "authorised" || st === "authorized") {
        score += 20;
        positives.push(`FCA Authorised firm (FRN ${fca.firm.frn})`);
        if (fca.firm.businessType) {
          positives.push(`Authorised activity: ${fca.firm.businessType}`);
        }
      } else if (st.includes("appointed representative")) {
        score += 10;
        positives.push(`FCA Appointed Representative (FRN ${fca.firm.frn})`);
      } else if (["cancelled", "withdrawn", "no longer"].some((s) => st.includes(s))) {
        score -= 20;
        flags.push(`FCA authorisation is ${fca.firm.status} — the firm is no longer regulated`);
      } else if (st === "exempt") {
        score += 5;
        positives.push(`Exempt from full FCA authorisation (FRN ${fca.firm.frn})`);
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  const verdict: CompanyCheckResult["verdict"] =
    score >= 70 ? "legitimate" : score >= 35 ? "suspicious" : "likely_fraudulent";

  const advice: string[] = [];
  if (verdict === "likely_fraudulent") {
    advice.push("Do not send money or share personal/financial details with this company.");
    if (flags.some((f) => f.includes("dissolved") || f.includes("no longer exists"))) {
      advice.push("The company has been dissolved. Anyone claiming to represent it is likely committing fraud.");
    }
    if (flags.some((f) => f.includes("Not found"))) {
      advice.push(
        "Legitimate UK companies must register at Companies House. Ask for their company number and verify it yourself at find-and-update.company-information.service.gov.uk.",
      );
    }
  } else if (verdict === "suspicious") {
    advice.push("Proceed with caution and do additional checks before parting with any money.");
    if (flags.some((f) => f.includes("months ago") || f.includes("month ago") || f.includes("less than a month"))) {
      advice.push("Newly formed companies are frequently used in investment and romance scams. Ask why the company is so new.");
    }
    if (flags.some((f) => f.toLowerCase().includes("fca"))) {
      advice.push("If this firm offers financial services or investments, they must be FCA authorised. Check the FCA register at register.fca.org.uk.");
    }
  } else {
    advice.push("Always contact the company using details from their official website — not contact details given to you in an unsolicited message.");
    if (positives.some((p) => p.includes("FCA"))) {
      advice.push("FCA authorisation covers specific regulated activities. Confirm the firm is authorised for the exact product or service they are offering.");
    }
  }
  advice.push("Report suspected fraud to Action Fraud: actionfraud.police.uk or 0300 123 2040.");

  return { legitimacyScore: score, verdict, flags, positives, advice };
}

export async function checkCompany(query: string): Promise<CompanyCheckResult> {
  const [ch, fca] = await Promise.all([lookupCompaniesHouse(query), lookupFca(query)]);
  const scoring = scoreAndVerdict(ch, fca);
  return { query, companiesHouse: ch, fca, ...scoring };
}
