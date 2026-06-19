import type { Verdict, RiskLevel, PhoneCheck } from "@/app/lib/scamAnalysis";

const RISK: Record<
  RiskLevel,
  {
    label: string;
    icon: string;
    banner: string;
    chip: string;
    label_text: string;
    bar: string;
  }
> = {
  safe: {
    label: "Safe",
    icon: "✓",
    banner: "from-emerald-50",
    chip: "bg-emerald-500",
    label_text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  suspicious: {
    label: "Suspicious",
    icon: "!",
    banner: "from-amber-50",
    chip: "bg-amber-500",
    label_text: "text-amber-700",
    bar: "bg-amber-500",
  },
  likely_scam: {
    label: "Likely Scam",
    icon: "✕",
    banner: "from-red-50",
    chip: "bg-red-500",
    label_text: "text-red-700",
    bar: "bg-red-500",
  },
};

export default function VerdictCard({ verdict }: { verdict: Verdict }) {
  const r = RISK[verdict.risk_level] ?? RISK.suspicious;
  const confidence = Math.min(100, Math.max(0, verdict.confidence || 0));

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Banner */}
      <div className={`bg-gradient-to-br ${r.banner} to-white p-6`}>
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${r.chip}`}
          >
            {r.icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verdict
            </div>
            <div className={`text-2xl font-bold ${r.label_text}`}>
              {r.label}
            </div>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <div className="text-xs font-medium text-slate-400">Confidence</div>
            <div className="text-2xl font-bold text-slate-900">
              {confidence}%
            </div>
          </div>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-full rounded-full ${r.bar}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-6 p-6">
        <div>
          {verdict.detected_type && (
            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              {verdict.detected_type}
            </span>
          )}
          <p className="mt-3 text-lg font-medium leading-snug text-slate-900">
            {verdict.summary}
          </p>
        </div>

        {verdict.red_flags.length > 0 && (
          <section className="rounded-xl border border-red-100 bg-red-50/60 p-4">
            <h3 className="text-sm font-semibold text-red-900">
              🚩 Red flags ({verdict.red_flags.length})
            </h3>
            <ul className="mt-2.5 space-y-2">
              {verdict.red_flags.map((flag, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                  >
                    !
                  </span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {verdict.link_checks && verdict.link_checks.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">🔗 Link checks</h3>
            <ul className="mt-2.5 space-y-3">
              {verdict.link_checks.map((c, i) => (
                <li key={i}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-sm text-slate-800">
                      {c.host}
                    </span>
                    {c.domainAgeDays !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.domainAgeDays <= 30
                            ? "bg-red-100 text-red-700"
                            : c.domainAgeDays <= 90
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {c.domainAgeDays < 365
                          ? `${c.domainAgeDays}d old`
                          : `${Math.floor(c.domainAgeDays / 365)}y old`}
                      </span>
                    )}
                  </div>
                  {c.safeBrowsingThreats && c.safeBrowsingThreats.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.safeBrowsingThreats.map((t, j) => (
                        <span
                          key={j}
                          className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
                        >
                          🛡 {t.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.flags.length > 0 ? (
                    <ul className="mt-1.5 space-y-1">
                      {c.flags.map((f, j) => (
                        <li
                          key={j}
                          className="flex gap-2 text-sm text-slate-600"
                        >
                          <span aria-hidden className="text-amber-500">
                            ⚠
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      No automated red flags on this domain.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {verdict.phone_checks && verdict.phone_checks.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">📞 Phone checks</h3>
            <ul className="mt-2.5 space-y-3">
              {verdict.phone_checks.map((c: PhoneCheck, i: number) => (
                <li key={i}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-slate-800">
                      {c.display ?? c.raw}
                    </span>
                    {c.lineType && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.lineType === "Premium rate" || c.lineType === "VoIP"
                            ? "bg-red-100 text-red-700"
                            : c.lineType === "Personal number" || c.lineType === "Shared cost"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.lineType}
                      </span>
                    )}
                    {c.carrier && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {c.carrier}
                      </span>
                    )}
                    {c.countryName && (
                      <span className="text-xs text-slate-400">{c.countryName}</span>
                    )}
                  </div>
                  {c.flags.length > 0 ? (
                    <ul className="mt-1.5 space-y-1">
                      {c.flags.map((f, j) => (
                        <li key={j} className="flex gap-2 text-sm text-slate-600">
                          <span aria-hidden className="text-amber-500">⚠</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      No automated red flags on this number.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-sm font-semibold text-slate-900">What this means</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {verdict.explanation}
          </p>
        </section>

        {verdict.advice.length > 0 && (
          <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <h3 className="text-sm font-semibold text-blue-900">
              What to do next
            </h3>
            <ul className="mt-2.5 space-y-2">
              {verdict.advice.map((tip, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white"
                  >
                    ✓
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
