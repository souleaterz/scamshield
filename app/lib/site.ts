/** Canonical site URL, used for metadata, sitemap, robots, and JSON-LD. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://scamshield.io"
).replace(/\/$/, "");

export const SITE_NAME = "ScamShield";
