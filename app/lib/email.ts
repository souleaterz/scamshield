/**
 * Minimal email sender backed by Resend's REST API. Fail-safe: if
 * RESEND_API_KEY isn't set, it logs and no-ops rather than throwing — matching
 * the app's "runs fine until configured" pattern.
 */

const FROM = process.env.EMAIL_FROM || "Guardurai <alerts@guardurai.com>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", opts.to);
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
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send error:", err);
    return false;
  }
}
