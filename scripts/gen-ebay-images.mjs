/**
 * Generate eBay listing images for the Guardurai gift-month codes.
 * Renders branded 1600x1600 PNGs into ./ebay-assets.
 *
 *   node scripts/gen-ebay-images.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1600;
const FONT = 'font-family="Arial, Helvetica, sans-serif"';

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Brand helpers ───────────────────────────────────────────────────────────
const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1f4d"/>
      <stop offset="0.55" stop-color="#1e40af"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#60a5fa" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#60a5fa" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

function shield(cx, cy, r, fill = "#ffffff", stroke = "#1e40af") {
  const p = [
    [cx, cy - r],
    [cx + 0.87 * r, cy - 0.5 * r],
    [cx + 0.87 * r, cy + 0.5 * r],
    [cx, cy + r],
    [cx - 0.87 * r, cy + 0.5 * r],
    [cx - 0.87 * r, cy - 0.5 * r],
  ]
    .map((q) => q.join(","))
    .join(" ");
  const cw = r * 0.55;
  return `
    <polygon points="${p}" fill="${fill}"/>
    <polyline points="${cx - cw},${cy} ${cx - cw * 0.2},${cy + cw * 0.85} ${cx + cw * 1.05},${cy - cw * 0.7}"
      fill="none" stroke="${stroke}" stroke-width="${r * 0.18}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function wordmark(x, y) {
  return `
    ${shield(x, y, 30, "#ffffff", "#1e40af")}
    <text x="${x + 52}" y="${y + 14}" ${FONT} font-size="44" font-weight="800" fill="#ffffff" letter-spacing="1">GUARDURAI</text>`;
}

const base = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
    ${defs}
    <rect width="${W}" height="${W}" fill="url(#bg)"/>
    <rect width="${W}" height="${W}" fill="url(#glow)"/>
    ${inner}
  </svg>`;

// Centered multi-line text helper.
function lines(cx, startY, arr, { size, weight = 700, fill = "#fff", lh = 1.25, ls = 0 } = {}) {
  return arr
    .map(
      (t, i) =>
        `<text x="${cx}" y="${startY + i * size * lh}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" letter-spacing="${ls}">${esc(t)}</text>`,
    )
    .join("");
}

// A left-aligned row with a gold check and label.
function checkRow(x, y, label, { size = 46 } = {}) {
  return `
    <circle cx="${x + 26}" cy="${y - size * 0.32}" r="26" fill="#fbbf24"/>
    <polyline points="${x + 14},${y - size * 0.32} ${x + 23},${y - size * 0.18} ${x + 39},${y - size * 0.5}"
      fill="none" stroke="#0b1f4d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x + 70}" y="${y}" ${FONT} font-size="${size}" font-weight="600" fill="#eaf2ff">${esc(label)}</text>`;
}

function pill(cx, y, text, { w = 760, fill = "rgba(255,255,255,0.12)", color = "#dbeafe", size = 34 } = {}) {
  return `
    <rect x="${cx - w / 2}" y="${y - 44}" width="${w}" height="64" rx="32" fill="${fill}"/>
    <text x="${cx}" y="${y}" ${FONT} font-size="${size}" font-weight="700" fill="${color}" text-anchor="middle">${esc(text)}</text>`;
}

// ── 1. Cover ────────────────────────────────────────────────────────────────
const cover = base(`
  ${wordmark(560, 150)}
  <g opacity="0.95">${shield(800, 560, 200, "#ffffff", "#1e40af")}</g>
  ${lines(800, 900, ["1 MONTH"], { size: 150, weight: 900, ls: 2 })}
  ${lines(800, 1010, ["FAMILY SCAM PROTECTION"], { size: 78, weight: 800, fill: "#fbbf24" })}
  ${lines(800, 1110, ["AI-powered, real-time protection for your whole household"], { size: 40, weight: 500, fill: "#dbeafe" })}
  ${pill(800, 1320, "✓  INSTANT DIGITAL CODE      ✓  NO CARD NEEDED", { w: 1080, size: 36 })}
  ${lines(800, 1470, ["Redeem at guardurai.com/redeem"], { size: 38, weight: 700, fill: "#93c5fd" })}
`);

// ── 2. Features ─────────────────────────────────────────────────────────────
const feats = [
  "Real-time blocking of scam & phishing sites",
  "Unlimited AI checks — texts, links, emails, numbers",
  "Family guardian alerts to protect loved ones",
  "Browser extension for Chrome, Edge, Brave & more",
  "Live scam database (URLhaus, FTC & community)",
  "Big, clear warnings the moment danger appears",
];
const features = base(`
  ${wordmark(560, 130)}
  ${lines(800, 290, ["WHAT'S INCLUDED"], { size: 76, weight: 900, fill: "#fbbf24" })}
  ${feats.map((f, i) => checkRow(220, 470 + i * 150, f, { size: 44 })).join("")}
`);

// ── 3. How to redeem ────────────────────────────────────────────────────────
function stepCard(y, n, title, body) {
  return `
    <circle cx="250" cy="${y}" r="58" fill="#fbbf24"/>
    <text x="250" y="${y + 22}" ${FONT} font-size="66" font-weight="900" fill="#0b1f4d" text-anchor="middle">${n}</text>
    <text x="350" y="${y - 10}" ${FONT} font-size="50" font-weight="800" fill="#ffffff">${esc(title)}</text>
    <text x="350" y="${y + 52}" ${FONT} font-size="38" font-weight="500" fill="#bfdbfe">${esc(body)}</text>`;
}
const howto = base(`
  ${wordmark(560, 130)}
  ${lines(800, 300, ["HOW TO REDEEM"], { size: 76, weight: 900, fill: "#fbbf24" })}
  ${stepCard(540, "1", "Get your code", "Sent to you straight after purchase")}
  ${stepCard(760, "2", "Go to guardurai.com/redeem", "Sign in or create a free account")}
  ${stepCard(980, "3", "Enter your code", "30 days of Family unlocked instantly")}
  ${pill(800, 1300, "No card required  ·  No auto-renewal  ·  It just ends", { w: 1180, size: 36 })}
`);

// ── 4. What it stops ────────────────────────────────────────────────────────
const stops = [
  "Phishing emails & fake login pages",
  "Fake delivery & parcel texts",
  "Bank, HMRC & PayPal impersonation",
  "Fake shops & too-good-to-be-true deals",
  "Scam & spam phone numbers",
  "Investment, crypto & romance fraud",
];
const whatstops = base(`
  ${wordmark(560, 130)}
  ${lines(800, 300, ["STOPS SCAMS LIKE THESE"], { size: 66, weight: 900, fill: "#fbbf24" })}
  ${stops.map((f, i) => checkRow(220, 480 + i * 150, f, { size: 44 })).join("")}
`);

// ── 5. Value ────────────────────────────────────────────────────────────────
const value = base(`
  ${wordmark(560, 150)}
  ${shield(800, 520, 150, "#ffffff", "#1e40af")}
  ${lines(800, 800, ["£9.99/month value"], { size: 110, weight: 900, fill: "#ffffff" })}
  ${lines(800, 900, ["Protect your whole family for 30 days"], { size: 46, weight: 600, fill: "#dbeafe" })}
  ${checkRow(470, 1080, "No card on file, ever", { size: 44 })}
  ${checkRow(470, 1210, "No surprise charges", { size: 44 })}
  ${checkRow(470, 1340, "Access simply ends when the month is up", { size: 44 })}
`);

// ── Render ──────────────────────────────────────────────────────────────────
const OUT = "ebay-assets";
mkdirSync(OUT, { recursive: true });

const images = [
  ["01-cover.png", cover],
  ["02-features.png", features],
  ["03-how-to-redeem.png", howto],
  ["04-what-it-stops.png", whatstops],
  ["05-value.png", value],
];

for (const [name, svg] of images) {
  writeFileSync(`${OUT}/${name.replace(".png", ".svg")}`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}`);
  console.log("✓", `${OUT}/${name}`);
}
console.log(`\nDone — ${images.length} images in ./${OUT}`);
