import { ImageResponse } from "next/og";
import { getSharedVerdict } from "@/app/lib/share";
import type { RiskLevel } from "@/app/lib/scamAnalysis";

export const runtime = "nodejs";
export const alt = "ScamShield verdict";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RISK: Record<RiskLevel, { label: string; color: string }> = {
  safe: { label: "Safe", color: "#10b981" },
  suspicious: { label: "Suspicious", color: "#f59e0b" },
  likely_scam: { label: "Likely Scam", color: "#ef4444" },
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const verdict = await getSharedVerdict((await params).id);
  const r = (verdict && RISK[verdict.risk_level]) || RISK.suspicious;
  const confidence = verdict?.confidence ?? 0;
  const rawSummary = verdict?.summary || "Check if it's a scam with ScamShield.";
  const summary =
    rawSummary.length > 180 ? rawSummary.slice(0, 178) + "…" : rawSummary;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0f172a" }}>
            ScamShield
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                background: r.color,
                color: "#fff",
                fontSize: 40,
                fontWeight: 700,
                padding: "10px 30px",
                borderRadius: 999,
              }}
            >
              {r.label}
            </div>
            <div style={{ display: "flex", fontSize: 32, color: "#64748b" }}>
              {confidence}% confidence
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 46,
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.25,
            }}
          >
            {summary}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#94a3b8" }}>
          Check your own message free at ScamShield
        </div>
      </div>
    ),
    size,
  );
}
