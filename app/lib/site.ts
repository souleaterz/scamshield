/** Canonical site URL, used for metadata, sitemap, robots, and JSON-LD. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://guardurai.com"
).replace(/\/$/, "");

export const SITE_NAME = "Guardurai";

/** Live Chrome Web Store listing for the Guardurai extension. */
export const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/guardurai-%E2%80%94-scam-checker/mkcomopebcifhpogmiogdplcfnmiacdi";
