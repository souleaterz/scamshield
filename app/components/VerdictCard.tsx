import type { Verdict, RiskLevel } from "@/app/lib/scamAnalysis";

const RISK_STYLES: Record<
  RiskLevel,
  { label: string; badge: string; bar: string; ring: string }
> = {
  safe: {
    label: "Safe",
    badge: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
    ring: "border-emerald-200",
  },
  suspicious: {
    label: "Suspicious",
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    ring: "border-amber-200",
  },
  likely_scam: {
    label: "Likely Scam",
    badge: "bg-red-100 text-red-800",
    bar: "bg-red-500",
    ring: "border-red-200",
  },
};

export default function VerdictCard({ verdict }: { verdict: Verdict }) {
  const style = RISK_STYLES[verdict.risk_level];

  return (
    <div
      className={`w-full rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${style.ring}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.badge}`}
        >
          {style.label}
        </span>
        <span className="text-sm text-slate-500">
          {verdict.detected_type}
        </span>
      </div>

      <p className="mt-4 text-lg font-medium text-slate-900">
        {verdict.summary}
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Confidence</span>
          <span className="font-medium text-slate-700">
            {verdict.confidence}%
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, verdict.confidence))}%` }}
          />
        </div>
      </div>

      {verdict.red_flags.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Red flags</h3>
          <ul className="mt-2 space-y-1.5">
            {verdict.red_flags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="text-red-500">
                  •
                </span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">
          What this means
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {verdict.explanation}
        </p>
      </section>

      {verdict.advice.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            What to do next
          </h3>
          <ul className="mt-2 space-y-1.5">
            {verdict.advice.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="text-blue-500">
                  →
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
