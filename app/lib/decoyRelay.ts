/**
 * Decoy relay: sends decoy messages from a per-decoy address on an isolated
 * subdomain (DECOY_RELAY_DOMAIN, e.g. "decoy.guardurai.com") via Resend, so the
 * scammer replies to us — never the user's real inbox.
 *
 * Gated behind config: if DECOY_RELAY_DOMAIN or RESEND_API_KEY isn't set, the
 * relay is considered off and callers fall back to the manual copy-paste flow.
 * Matches the app's "runs fine until configured" pattern.
 */

import type { DecoyPersona } from "@/app/lib/decoyPersona";

export function relayDomain(): string | null {
  return process.env.DECOY_RELAY_DOMAIN?.trim() || null;
}

export function isRelayConfigured(): boolean {
  return Boolean(relayDomain() && process.env.RESEND_API_KEY);
}

/** Lowercase, strip anything that isn't a-z0-9 from a name part. */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * A unique, believable-looking inbox for a decoy, e.g.
 * "sarah.mitchell.7f3a@decoy.guardurai.com". The random suffix guarantees
 * uniqueness even when two decoys share a generated name.
 */
export function makeRelayAddress(persona: DecoyPersona): string | null {
  const domain = relayDomain();
  if (!domain) return null;
  const first = slug(persona.name.first) || "user";
  const last = slug(persona.name.last) || "x";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${first}.${last}.${suffix}@${domain}`;
}

/** Display name for the From header — the persona's full name. */
export function relayFrom(persona: DecoyPersona, address: string): string {
  return `${persona.name.full} <${address}>`;
}

/**
 * Send a plain-text decoy email via Resend. Scammers expect a normal personal
 * email, so we send text/plain (no HTML chrome). Returns true on success.
 */
export async function sendDecoyEmail(opts: {
  from: string; // already formatted "Name <addr@decoy.domain>"
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[decoy-relay] RESEND_API_KEY not set — skipping send");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("[decoy-relay] send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[decoy-relay] send error:", err);
    return false;
  }
}
