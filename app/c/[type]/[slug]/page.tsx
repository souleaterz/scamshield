import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getEntityPage,
  getCommentsForEntity,
} from "@/app/lib/entityPages";
import type { EntityType } from "@/app/lib/entityPages";
import CommentForm from "@/app/components/CommentForm";
import type { RiskLevel, Verdict } from "@/app/lib/scamAnalysis";
import type { CompanyCheckResult } from "@/app/lib/companyCheck";

export const revalidate = 3600;

const VALID_TYPES: string[] = ["domain", "phone", "company"];

const RISK_LABEL: Record<RiskLevel, string> = {
  likely_scam: "Likely scam",
  suspicious: "Suspicious",
  safe: "Looks safe",
};

const RISK_CHIP: Record<RiskLevel, string> = {
  likely_scam: "bg-red-100 text-red-800 border border-red-200",
  suspicious: "bg-amber-100 text-amber-800 border border-amber-200",
  safe: "bg-emerald-100 text-emerald-800 border border-emerald-200",
};

const TYPE_ICON: Record<EntityType, string> = {
  domain: "🌐",
  phone: "📞",
  company: "🏢",
};

const TYPE_LABEL: Record<EntityType, string> = {
  domain: "Website / domain",
  phone: "Phone number",
  company: "Company",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function VerdictDisplay({ verdict }: { verdict: Verdict }) {
  return (
    <div className="space-y-4">
      {verdict.summary && (
        <p className="text-slate-700">{verdict.summary}</p>
      )}
      {verdict.red_flags && verdict.red_flags.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Red flags</h3>
          <ul className="space-y-1">
            {verdict.red_flags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
      {verdict.advice && verdict.advice.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">What to do</h3>
          <ul className="space-y-1">
            {verdict.advice.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-blue-500" aria-hidden>→</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompanyDisplay({ result }: { result: CompanyCheckResult }) {
  const ch = result.companiesHouse;
  const fca = result.fca;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Companies House
          </p>
          {ch.found && ch.company ? (
            <div className="mt-1 space-y-0.5 text-sm">
              <p className="font-medium text-slate-900">{ch.company.name}</p>
              <p className="text-slate-600">
                #{ch.company.companyNumber} · {ch.company.status}
              </p>
              {ch.company.incorporatedOn && (
                <p className="text-slate-500">
                  Incorporated {formatDate(ch.company.incorporatedOn)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              Not found in Companies House register
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            FCA Register
          </p>
          {fca.found && fca.firm ? (
            <div className="mt-1 space-y-0.5 text-sm">
              <p className="font-medium text-slate-900">{fca.firm.name}</p>
              <p className="text-slate-600">
                FRN {fca.firm.frn} · {fca.firm.status}
              </p>
              {fca.firm.businessType && (
                <p className="text-slate-500">{fca.firm.businessType}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              Not listed in FCA register
            </p>
          )}
        </div>
      </div>

      {result.flags.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Concerns</h3>
          <ul className="space-y-1">
            {result.flags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.positives.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Positive signals
          </h3>
          <ul className="space-y-1">
            {result.positives.map((pos, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden>✓</span>
                {pos}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.advice.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">What to do</h3>
          <ul className="space-y-1">
            {result.advice.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-blue-500" aria-hidden>→</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}): Promise<Metadata> {
  const { type, slug } = await params;
  const entity = await getEntityPage(type, slug);
  if (!entity) return { title: "Not found — Guardurai" };

  const riskLabel = entity.risk_level ? RISK_LABEL[entity.risk_level] : "Checked";
  return {
    title: `${entity.display_name} — ${riskLabel} | Guardurai`,
    description: `Community scam report for ${entity.display_name}. Checked ${entity.check_count} time${entity.check_count !== 1 ? "s" : ""} on Guardurai. See verdict, red flags, and community comments.`,
  };
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  if (!VALID_TYPES.includes(type)) notFound();

  const entity = await getEntityPage(type, slug);
  if (!entity) notFound();

  const comments = await getCommentsForEntity(entity.id);
  const riskLevel = entity.risk_level;
  const verdict = entity.latest_verdict;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        ← Back to Guardurai
      </Link>

      <header className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {TYPE_ICON[entity.entity_type]}
          </span>
          <h1 className="break-all text-2xl font-bold tracking-tight text-slate-900">
            {entity.display_name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {riskLevel && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${RISK_CHIP[riskLevel]}`}
            >
              {RISK_LABEL[riskLevel]}
            </span>
          )}
          <span className="text-sm text-slate-500">
            {TYPE_LABEL[entity.entity_type]}
          </span>
        </div>

        <p className="text-sm text-slate-400">
          Checked{" "}
          <strong className="text-slate-600">{entity.check_count}</strong>{" "}
          time{entity.check_count !== 1 ? "s" : ""} · First reported{" "}
          <strong className="text-slate-600">
            {formatDate(entity.created_at)}
          </strong>{" "}
          · Last seen{" "}
          <strong className="text-slate-600">
            {timeAgo(entity.last_checked_at)}
          </strong>
        </p>
      </header>

      {verdict && (
        <section className="mt-8">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Latest verdict
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {entity.entity_type === "company" ? (
              <CompanyDisplay
                result={verdict as unknown as CompanyCheckResult}
              />
            ) : (
              <VerdictDisplay verdict={verdict as unknown as Verdict} />
            )}
          </div>
        </section>
      )}

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
        <p className="text-sm text-slate-700">
          Have more information about{" "}
          <strong className="text-slate-900">{entity.display_name}</strong>?
        </p>
        <Link
          href="/"
          className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Run a fresh check →
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Community reports
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({comments.length})
          </span>
        </h2>

        {comments.length > 0 ? (
          <div className="mb-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {comments.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {c.author_name ?? "Anonymous"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-6 text-sm text-slate-500">
            No community reports yet. Be the first to share your experience.
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Share your experience
          </h3>
          <CommentForm entityId={entity.id} />
        </div>
      </section>
    </main>
  );
}
