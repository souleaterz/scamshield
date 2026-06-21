import { NextResponse } from "next/server";
import { sendEmail, isEmailConfigured } from "@/app/lib/email";

export const runtime = "nodejs";

// Temporary diagnostic: verifies the production email pipeline end-to-end.
// Protected by CRON_SECRET. Remove after confirming alerts send.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = new URL(request.url).searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Pass ?to=email" }, { status: 400 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY not set in this environment." },
      { status: 503 },
    );
  }

  const sent = await sendEmail({
    to,
    subject: "⚠️ Guardurai alert: Mum may have hit a scam",
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">⚠️ Possible scam detected</h2>
        <p style="color:#334155;font-size:15px">
          <strong>Mum</strong> just encountered something Guardurai flagged as a
          <strong style="color:#ef4444">likely scam</strong>.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin:14px 0">
          <p style="margin:0;color:#7f1d1d;font-size:14px">
            <strong>Website visit:</strong> Visited dodgy-prize-claim.xyz — Flagged by URLhaus malware database.
          </p>
        </div>
        <p style="color:#334155;font-size:15px">
          You may want to check in with them before they take any action.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          This is a Guardurai test alert.
        </p>
      </div>`,
  });

  return NextResponse.json({ ok: sent, to });
}
