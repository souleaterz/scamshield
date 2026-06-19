import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedVerdict } from "@/app/lib/share";
import { SITE_URL } from "@/app/lib/site";
import type { RiskLevel } from "@/app/lib/scamAnalysis";

const RISK: Record<
  RiskLevel,
  { label: string; icon: string; chip: string; text: string; banner: string }
> = {
  safe: {
    label: "Safe",
    icon: "✓",
    chip: "bg-emerald-500",
    text: "text-emerald-700",
    banner: "from-emerald-50",
  },
  suspicious: {
    label: "Suspicious",
    icon: "!",
    chip: "bg-amber-500",
    text: "text-amber-700",
    banner: "from-amber-50",
  },
  likely_scam: {
    label: "Likely Scam",
    icon: "✕",
    chip: "bg-red-500",
    text: "text-red-700",
    banner: "from-red-50",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const verdict = await getSharedVerdict((await params).id);
  if (!verdict) return { title: "Verdict not found | ScamShield" };

  const label = RISK[verdict.risk_level]?.label ?? "Verdict";
  const title = `ScamShield: ${label} (${verdict.confidence}% confidence)`;
  return {
    title,
    description: verdict.summary,
    alternates: { canonical: `${SITE_URL}/r/${verdict.id}` },
    openGraph: {
      title,
      description: verdict.summary,
      url: `${SITE_URL}/r/${verdict.id}`,
    },
  };
}

export default async function SharedVerdictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const verdict = await getSharedVerdict((await params).id);
  if (!verdict) notFound();

  const r = RISK[verdict.risk_level] ?? RISK.suspicious;
  const confidence = Math.min(100, Math.max(0, verdict.confidence || 0));

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12 sm:py-16">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`bg-gradient-to-br ${r.banner} to-white p-6`}>
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${r.chip}`}
            >
              {r.icon}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                ScamShield verdict
              </div>
              <div className={`text-2xl font-bold ${r.text}`}>{r.label}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs font-medium text-slate-400">
                Confidence
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {confidence}%
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {verdict.detected_type && (
            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              {verdict.detected_type}
            </span>
          )}
          <p className="mt-3 text-lg font-medium leading-snug text-slate-900">
            {verdict.summary}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          Got a suspicious message of your own?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Paste any text, link, phone number, or screenshot into ScamShield and
          get an instant verdict — free.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Check a message free
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        Shared from ScamShield · guidance, not a guarantee.
      </p>
    </main>
  );
}
