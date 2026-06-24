/**
 * Generate single-use gift-month redemption codes and insert them into the
 * redemption_codes table. Each code grants Pro/Family for `--days` (default 30)
 * with no card and no auto-charge — ideal for selling on eBay etc.
 *
 * Usage:
 *   node scripts/gen-redemption-codes.mjs --tier=pro --count=50 --batch=ebay-jun
 *   node scripts/gen-redemption-codes.mjs --tier=family --count=20 --days=30
 *
 * Flags:
 *   --tier=pro|family   (required)
 *   --count=N           how many codes to make (default 10)
 *   --days=N            length of access granted (default 30)
 *   --batch=label       tracking label (default: gen-YYYY-MM-DD)
 *   --dry-run           print codes without inserting
 *
 * Prereqs: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (or exported). The codes are printed to stdout — save them; they're the only
 * copy you'll get in a usable form.
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { randomInt } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local if present (simple key=value parser, no dotenv dep needed).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const TIER = args.tier;
const COUNT = parseInt(args.count ?? "10", 10);
const DAYS = parseInt(args.days ?? "30", 10);
const BATCH = args.batch ?? `gen-${new Date().toISOString().slice(0, 10)}`;
const DRY_RUN = Boolean(args["dry-run"]);

if (TIER !== "pro" && TIER !== "family") {
  console.error("Error: --tier must be 'pro' or 'family'.");
  process.exit(1);
}
if (!Number.isInteger(COUNT) || COUNT < 1 || COUNT > 5000) {
  console.error("Error: --count must be between 1 and 5000.");
  process.exit(1);
}

// Unambiguous alphabet — no 0/O/1/I/L so codes are easy to type from a label.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode() {
  const group = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

const codes = new Set();
while (codes.size < COUNT) codes.add(makeCode());
const rows = [...codes].map((code) => ({
  code,
  tier: TIER,
  duration_days: DAYS,
  batch: BATCH,
}));

console.log(`\n${COUNT} ${TIER.toUpperCase()} codes · ${DAYS} days · batch "${BATCH}"\n`);
for (const r of rows) console.log(r.code);
console.log("");

if (DRY_RUN) {
  console.log("(dry run — nothing inserted)");
  process.exit(0);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  // Node < 22 has no native WebSocket; supabase-js needs ws for its client.
  realtime: { transport: ws },
});

const { error } = await supabase.from("redemption_codes").insert(rows);
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}
console.log(`✅ Inserted ${COUNT} codes. Sell them; buyers redeem at /redeem.`);
