/**
 * Seed the scam_reports table from two free public sources:
 *
 *   1. FCA Warning List — ~3,000+ unauthorized UK financial firms.
 *      Published by the Financial Conduct Authority.
 *      URL: https://www.fca.org.uk/publication/data/warning-list-of-firms.csv
 *
 *   2. URLhaus (abuse.ch) — active malware/phishing URLs, updated daily.
 *      URL: https://urlhaus.abuse.ch/downloads/csv_online/
 *
 * Usage:
 *   node scripts/seed-scam-db.mjs [--fca] [--urlhaus] [--dry-run]
 *   (no flags = run both sources)
 *
 * Prerequisites:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local
 *   or exported in your shell.
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const RUN_FCA = args.includes("--fca") || args.length === 0 || DRY_RUN;
const RUN_URLHAUS = args.includes("--urlhaus") || args.length === 0 || DRY_RUN;

// Load .env.local if present (simple key=value parser, no dotenv dep needed).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeDomain(raw) {
  try {
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

async function upsertBatch(rows) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would upsert ${rows.length} rows`);
    return;
  }
  // Use the stored function for atomic upsert with incrementing counts.
  for (const r of rows) {
    await supabase.rpc("increment_scam_report", {
      p_input_type: r.input_type,
      p_input_value: r.input_value,
      p_source: r.source,
      p_label: r.source_label ?? null,
    });
  }
}

async function fetchText(url) {
  console.log(`  Fetching ${url} …`);
  const res = await fetch(url, {
    headers: { "User-Agent": "ScamShield-Seeder/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// FCA Warning List
// ---------------------------------------------------------------------------

async function seedFca() {
  console.log("\n=== FCA Warning List ===");
  // The FCA moved their warning list. Try both known URLs.
  const CSV_URLS = [
    "https://www.fca.org.uk/publication/data/warning-list-of-firms.csv",
    "https://www.fca.org.uk/publication/data/ScamSmart-Warnings.csv",
  ];

  let csv;
  for (const url of CSV_URLS) {
    try {
      csv = await fetchText(url);
      break;
    } catch {
      // try next
    }
  }

  if (!csv) {
    console.warn("  Could not fetch FCA Warning List automatically.");
    console.warn("  Download the CSV from: https://www.fca.org.uk/consumers/protect-yourself");
    console.warn("  Then run: node scripts/seed-scam-db.mjs --fca-file=/path/to/warning-list.csv");
    return;
  }

  const lines = csv.split("\n").slice(1); // skip header
  const rows = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // CSV columns vary by version — typically: firm_name, url, ...
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const firmName = cols[0];
    const rawUrl = cols[1];

    if (rawUrl) {
      const domain = normalizeDomain(rawUrl);
      if (domain && domain.length > 3) {
        rows.push({
          input_type: "domain",
          input_value: domain,
          source: "fca",
          source_label: firmName ? `FCA Warning List: ${firmName}` : "FCA Warning List",
        });
      }
    }
  }

  console.log(`  Parsed ${rows.length} domain entries`);
  await upsertBatch(rows);
  console.log(`  Done.`);
}

// ---------------------------------------------------------------------------
// URLhaus (abuse.ch) — active malware/phishing URLs
// ---------------------------------------------------------------------------

async function seedUrlhaus() {
  console.log("\n=== URLhaus (abuse.ch) ===");
  const CSV_URL = "https://urlhaus.abuse.ch/downloads/csv_online/";

  let csv;
  try {
    csv = await fetchText(CSV_URL);
  } catch (e) {
    console.warn(`  Could not fetch URLhaus CSV: ${e.message}`);
    return;
  }

  const lines = csv.split("\n").filter((l) => l && !l.startsWith("#"));
  const rows = [];
  const seen = new Set();

  for (const line of lines) {
    // Format: id, dateadded, url, url_status, last_online, threat, tags, urlhaus_link, reporter
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const url = cols[2];
    if (!url) continue;
    const domain = normalizeDomain(url);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    rows.push({
      input_type: "domain",
      input_value: domain,
      source: "urlhaus",
      source_label: "URLhaus malware/phishing database",
    });
  }

  console.log(`  Parsed ${rows.length} unique domains`);

  // Batch in chunks of 100 to avoid overwhelming the DB.
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await upsertBatch(rows.slice(i, i + CHUNK));
    if (!DRY_RUN) process.stdout.write(`\r  Upserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  if (!DRY_RUN) console.log();
  console.log("  Done.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`ScamShield scam database seeder${DRY_RUN ? " [DRY RUN]" : ""}`);
if (RUN_FCA) await seedFca();
if (RUN_URLHAUS) await seedUrlhaus();
console.log("\nSeeding complete.");
