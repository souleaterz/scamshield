// Generates the ScamShield brand mark in every size we need:
//   - extension/icons/icon{16,32,48,128}.png  (transparent, for the extension)
//   - app/icon.svg                            (site favicon, modern browsers)
//   - app/apple-icon.png                      (180px, white bg, for iOS)
//
// Run with: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <path d="M32 3 L57 13 V31 C57 46 46 57 32 61 C18 57 7 46 7 31 V13 Z" fill="url(#g)"/>
  <path d="M21 32 l8 9 l15 -18" fill="none" stroke="#fff" stroke-width="6"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const root = resolve(import.meta.dirname, "..");
mkdirSync(resolve(root, "extension/icons"), { recursive: true });

for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(resolve(root, `extension/icons/icon${size}.png`));
}

writeFileSync(resolve(root, "app/icon.svg"), svg + "\n");

await sharp(Buffer.from(svg))
  .resize(180, 180)
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(resolve(root, "app/apple-icon.png"));

console.log("✓ icons generated");
