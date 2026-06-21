import { ImageResponse } from "next/og";
import { getEntityPage, getScamReportCount } from "@/app/lib/entityPages";
import type { EntityType } from "@/app/lib/entityPages";
import { communityRiskLevel } from "@/app/lib/communityReports";
import type { RiskLevel } from "@/app/lib/scamAnalysis";

export const runtime = "nodejs";
export const alt = "Guardurai scam check";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RISK: Record<RiskLevel, { label: string; color: string }> = {
  safe: { label: "Looks safe", color: "#10b981" },
  suspicious: { label: "Suspicious", color: "#f59e0b" },
  likely_scam: { label: "Likely scam", color: "#ef4444" },
};

const TYPE_LABEL: Record<EntityType, string> = {
  domain: "Website",
  phone: "Phone number",
  company: "Company",
};

export default async function Image({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  const [entity, reportCount] = await Promise.all([
    getEntityPage(type, slug),
    getScamReportCount(type as EntityType, slug),
  ]);

  const name = entity?.display_name ?? "this";
  const displayName = name.length > 32 ? name.slice(0, 31) + "…" : name;

  const communityRisk = communityRiskLevel(reportCount);
  const effective: RiskLevel = communityRisk ?? entity?.risk_level ?? "suspicious";
  const r = RISK[effective];
  const typeLabel = entity ? TYPE_LABEL[entity.entity_type] : "Scam check";
  const checks = entity?.check_count ?? 0;

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
            Guardurai
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#64748b" }}>
            {typeLabel} · Is it a scam?
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {displayName}
          </div>
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
            {checks > 0 && (
              <div style={{ display: "flex", fontSize: 30, color: "#64748b" }}>
                Checked {checks} time{checks !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#94a3b8" }}>
          See the full verdict & community reports on Guardurai
        </div>
      </div>
    ),
    size,
  );
}
