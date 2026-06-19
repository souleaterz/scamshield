"use client";

import type { CompanyCheckResult } from "@/app/lib/companyCheck";

const VERDICT_CONFIG = {
  legitimate: {
    label: "Legitimate",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ringColor: "#10b981",
    badge: "bg-emerald-100 text-emerald-800",
  },
  suspicious: {
    label: "Suspicious",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    ringColor: "#f59e0b",
    badge: "bg-amber-100 text-amber-800",
  },
  likely_fraudulent: {
    label: "Likely Fraudulent",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    ringColor: "#ef4444",
    badge: "bg-red-100 text-red-800",
  },
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  dissolved: "bg-red-100 text-red-800",
  liquidation: "bg-red-100 text-red-800",
  administration: "bg-orange-100 text-orange-800",
  "insolvency-proceedings": "bg-red-100 text-red-800",
  "voluntary-arrangement": "bg-orange-100 text-orange-800",
  "converted-closed": "bg-slate-100 text-slate-700",
  removed: "bg-red-100 text-red-800",
};

const FCA_STATUS_BADGE: Record<string, string> = {
  authorised: "bg-emerald-100 text-emerald-800",
  authorized: "bg-emerald-100 text-emerald-800",
  "appointed representative": "bg-blue-100 text-blue-800",
  exempt: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  withdrawn: "bg-red-100 text-red-800",
  "no longer authorised": "bg-red-100 text-red-800",
};

function statusBadgeClass(status: string): string {
  const key = status.toLowerCase();
  return STATUS_BADGE[key] ?? "bg-slate-100 text-slate-700";
}

function fcaBadgeClass(status: string): string {
  const key = status.toLowerCase();
  for (const [k, v] of Object.entries(FCA_STATUS_BADGE)) {
    if (key.includes(k)) return v;
  }
  return "bg-slate-100 text-slate-700";
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="42" cy="42" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="42" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </h3>
  );
}

export default function CompanyVerdictCard({ result }: { result: CompanyCheckResult }) {
  const cfg = VERDICT_CONFIG[result.verdict];

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5`}>
        <div className="flex items-center gap-5">
          <ScoreRing score={result.legitimacyScore} color={cfg.ringColor} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legitimacy Score</p>
            <p className={`mt-0.5 text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
            <p className="mt-1 text-sm text-slate-600 truncate">
              Checked: <span className="font-medium">{result.query}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Companies House */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <SectionLabel>Companies House</SectionLabel>
        {!result.companiesHouse.searchAttempted ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Companies House check not available</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Add <code className="rounded bg-amber-100 px-1">COMPANIES_HOUSE_API_KEY</code> to enable this check.
              Register free at{" "}
              <a
                href="https://developer.company-information.service.gov.uk/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                developer.company-information.service.gov.uk
              </a>
            </p>
          </div>
        ) : result.companiesHouse.found && result.companiesHouse.company ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{result.companiesHouse.company.name}</p>
                <p className="text-xs text-slate-500">#{result.companiesHouse.company.companyNumber}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(result.companiesHouse.company.status)}`}>
                {result.companiesHouse.company.status.replace(/-/g, " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              {result.companiesHouse.company.incorporatedOn && (
                <div>
                  <span className="font-medium text-slate-500">Incorporated</span>
                  <p>{new Date(result.companiesHouse.company.incorporatedOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
              {result.companiesHouse.company.ageMonths !== null && (
                <div>
                  <span className="font-medium text-slate-500">Age</span>
                  <p>
                    {result.companiesHouse.company.ageMonths < 12
                      ? `${result.companiesHouse.company.ageMonths} month${result.companiesHouse.company.ageMonths === 1 ? "" : "s"}`
                      : `${Math.floor(result.companiesHouse.company.ageMonths / 12)} year${Math.floor(result.companiesHouse.company.ageMonths / 12) === 1 ? "" : "s"}`}
                  </p>
                </div>
              )}
              {result.companiesHouse.company.companyType && (
                <div>
                  <span className="font-medium text-slate-500">Type</span>
                  <p className="capitalize">{result.companiesHouse.company.companyType.replace(/-/g, " ")}</p>
                </div>
              )}
              {result.companiesHouse.company.registeredAddress && (
                <div className="col-span-2">
                  <span className="font-medium text-slate-500">Registered address</span>
                  <p>{result.companiesHouse.company.registeredAddress}</p>
                </div>
              )}
            </div>
            <a
              href={`https://find-and-update.company-information.service.gov.uk/company/${result.companiesHouse.company.companyNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View on Companies House →
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">No matching company found</p>
            <p className="mt-0.5 text-xs">
              No UK company matches this name or number in the Companies House register.
              {result.companiesHouse.error && (
                <span className="ml-1 text-slate-400">({result.companiesHouse.error})</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* FCA Register */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <SectionLabel>FCA Financial Services Register</SectionLabel>
        {!result.fca.searchAttempted ? (
          <p className="text-sm text-slate-500">FCA check did not run.</p>
        ) : result.fca.found && result.fca.firm ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{result.fca.firm.name}</p>
                <p className="text-xs text-slate-500">FRN {result.fca.firm.frn}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${fcaBadgeClass(result.fca.firm.status)}`}>
                {result.fca.firm.status}
              </span>
            </div>
            {result.fca.firm.businessType && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-500">Business type: </span>
                {result.fca.firm.businessType}
              </p>
            )}
            <a
              href={`https://register.fca.org.uk/s/firm?id=${result.fca.firm.frn}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View on FCA register →
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Not found on FCA register</p>
            <p className="mt-0.5 text-xs">
              This company is not listed as an FCA authorised or registered firm.
              {result.fca.error && (
                <span className="ml-1 text-slate-400">({result.fca.error})</span>
              )}
              {!result.fca.error && (
                <span className="ml-1">This is normal for non-financial businesses.</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Red flags */}
      {result.flags.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <SectionLabel>Red Flags</SectionLabel>
          <ul className="space-y-1.5">
            {result.flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                <span className="mt-0.5 shrink-0 text-red-500">✕</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Positives */}
      {result.positives.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <SectionLabel>Verified</SectionLabel>
          <ul className="space-y-1.5">
            {result.positives.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                <span className="mt-0.5 shrink-0 text-emerald-600">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advice */}
      {result.advice.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <SectionLabel>What to do</SectionLabel>
          <ol className="list-decimal list-inside space-y-2">
            {result.advice.map((a, i) => (
              <li key={i} className="text-sm text-blue-900 leading-snug">
                {a}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
