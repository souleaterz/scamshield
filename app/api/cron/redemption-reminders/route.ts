import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { sendEmail } from "@/app/lib/email";
import { SITE_URL } from "@/app/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY_MS = 86_400_000;
// Email people whose gift access ends within this many days.
const REMIND_WINDOW_DAYS = 3;

const TIER_LABEL: Record<string, string> = { pro: "Pro", family: "Family" };
const TIER_PRICE: Record<string, string> = { pro: "£4.99", family: "£9.99" };

function reminderHtml(tier: string, daysLeft: number): string {
  const label = TIER_LABEL[tier] ?? "Pro";
  const price = TIER_PRICE[tier] ?? "£4.99";
  const url = `${SITE_URL}/?plan=${tier}&ref=expiry#pricing`;
  const when = daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
    <h2 style="font-size:20px;margin:0 0 12px">Your Guardurai ${label} ends ${when}</h2>
    <p style="font-size:15px;line-height:1.55;color:#334155;margin:0 0 14px">
      Your free month of ${label} protection is almost up. Keep your scam
      protection — and ${tier === "family" ? "your family's" : "your"} peace of
      mind — running without interruption.
    </p>
    <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;
       text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">
      Keep ${label} for ${price}/mo →
    </a>
    <p style="font-size:13px;color:#64748b;margin:18px 0 0">
      No pressure — if you do nothing, your account simply returns to the free
      plan. You can re-subscribe any time.
    </p>
    <p style="font-size:12px;color:#94a3b8;margin:16px 0 0">🛡️ Guardurai</p>
  </div>`;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  // Redeemed grants we haven't reminded yet and that have an email on file.
  const { data, error } = await supabase
    .from("redemption_codes")
    .select("code, tier, duration_days, redeemed_at, redeemed_email")
    .eq("status", "redeemed")
    .is("reminded_at", null)
    .not("redeemed_email", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  const now = Date.now();
  const windowEnd = now + REMIND_WINDOW_DAYS * DAY_MS;

  // Keep only grants expiring within the window (computed here since the grant
  // end = redeemed_at + duration_days isn't a stored column).
  const due = (data ?? [])
    .map((r) => {
      const start = r.redeemed_at ? new Date(r.redeemed_at).getTime() : 0;
      const expires = start + (r.duration_days ?? 30) * DAY_MS;
      return { ...r, expires };
    })
    .filter((r) => r.expires > now && r.expires <= windowEnd);

  let sent = 0;
  let failed = 0;
  for (const r of due) {
    const daysLeft = Math.max(1, Math.ceil((r.expires - now) / DAY_MS));
    const ok = await sendEmail({
      to: r.redeemed_email as string,
      subject: `Your Guardurai ${TIER_LABEL[r.tier] ?? "Pro"} ends soon`,
      html: reminderHtml(r.tier, daysLeft),
    });
    if (ok) {
      // Stamp only on success, so a failed send retries on the next run.
      await supabase
        .from("redemption_codes")
        .update({ reminded_at: new Date().toISOString() })
        .eq("code", r.code);
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: failed === 0, candidates: due.length, sent, failed });
}
