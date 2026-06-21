import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getEntityPage,
  getCommentsForEntity,
  getScamReportCount,
  getRelatedEntities,
} from "@/app/lib/entityPages";
import type { EntityType, EntityPage as EntityPageType } from "@/app/lib/entityPages";
import { communityRiskLevel } from "@/app/lib/communityReports";
import { SITE_URL } from "@/app/lib/site";
import CommentForm from "@/app/components/CommentForm";
import FlagAsScamButton from "@/app/components/FlagAsScamButton";
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

const TYPE_NOUN: Record<EntityType, string> = {
  domain: "website",
  phone: "phone number",
  company: "company",
};

function riskPhrase(risk: RiskLevel | null): string {
  switch (risk) {
    case "likely_scam":
      return "flagged as a likely scam";
    case "suspicious":
      return "rated as suspicious";
    case "safe":
      return "currently showing a low risk";
    default:
      return "been checked";
  }
}

/** A unique, crawlable intro paragraph for each page (mixes name + verdict + counts). */
function buildLede(
  entity: EntityPageType,
  effectiveRisk: RiskLevel | null,
  reportCount: number,
): string {
  const noun = TYPE_NOUN[entity.entity_type];
  const times = `${entity.check_count} time${entity.check_count !== 1 ? "s" : ""}`;
  const community =
    reportCount > 0
      ? ` ${reportCount} ${reportCount === 1 ? "person has" : "people have"} reported it to our community.`
      : "";
  return `${entity.display_name} is a ${noun} that has been checked ${times} on Guardurai and has ${riskPhrase(effectiveRisk)}.${community} Below you'll find the latest verdict, the warning signs to look for, and real reports from other people.`;
}

/** Evergreen, type-specific safety guidance — adds substantive on-page content. */
const SAFETY: Record<EntityType, { heading: string; points: string[] }> = {
  domain: {
    heading: "How to tell if a website is a scam",
    points: [
      "Check the exact spelling of the address — scammers use look-alike domains (e.g. an extra letter or a different ending).",
      "Be wary of very new websites, prices that are too good to be true, and pressure to pay by bank transfer, gift card, or crypto.",
      "Never enter card or login details on a site you reached from an unexpected text or email.",
      "Look for genuine contact details and reviews on independent sites — not just on the website itself.",
    ],
  },
  phone: {
    heading: "What to do about a suspicious phone number",
    points: [
      "Banks, HMRC, and the police will never ask you to move money, share a PIN, or read out a one-time code over the phone.",
      "If a call claims to be from your bank, hang up and call back using the number on the back of your card.",
      "Don't trust caller ID — scammers can spoof legitimate numbers.",
      "Report scam calls and texts (UK: forward texts to 7726, report to Action Fraud).",
    ],
  },
  company: {
    heading: "How to check a company is legitimate",
    points: [
      "Search the company on Companies House and, for anything financial, the FCA register.",
      "Be cautious of 'clone firms' that copy the name and details of a real, authorised company.",
      "Never invest or pay based on a cold call, social media advert, or unsolicited message.",
      "If returns sound guaranteed or unusually high, treat it as a major red flag.",
    ],
  },
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
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Red flags
          </h3>
          <ul className="space-y-1">
            {verdict.red_flags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>
                  ⚠
                </span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
      {verdict.advice && verdict.advice.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            What to do
          </h3>
          <ul className="space-y-1">
            {verdict.advice.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-blue-500" aria-hidden>
                  →
                </span>
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
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Concerns
          </h3>
          <ul className="space-y-1">
            {result.flags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>
                  ⚠
                </span>
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
                <span
                  className="mt-0.5 shrink-0 text-emerald-500"
                  aria-hidden
                >
                  ✓
                </span>
                {pos}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.advice.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            What to do
          </h3>
          <ul className="space-y-1">
            {result.advice.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-blue-500" aria-hidden>
                  →
                </span>
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

  const riskLabel = entity.risk_level
    ? RISK_LABEL[entity.risk_level]
    : "Checked";
  const noun = TYPE_NOUN[entity.entity_type];
  const canonical = `${SITE_URL}/c/${entity.entity_type}/${entity.slug}`;
  const title = `Is ${entity.display_name} a scam? — ${riskLabel} | Guardurai`;
  const description = `Is the ${noun} ${entity.display_name} a scam? Guardurai's verdict: ${riskLabel}. Checked ${entity.check_count} time${entity.check_count !== 1 ? "s" : ""} — see the warning signs, advice, and real community reports.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article" },
  };
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  if (!VALID_TYPES.includes(type)) notFound();

  const [entity, reportCount] = await Promise.all([
    getEntityPage(type, slug),
    getScamReportCount(type as EntityType, slug),
  ]);
  if (!entity) notFound();

  const [entityComments, related] = await Promise.all([
    getCommentsForEntity(entity.id),
    getRelatedEntities(entity.entity_type, entity.slug, 6),
  ]);

  const riskLevel = entity.risk_level;
  const verdict = entity.latest_verdict;
  const communityRisk = communityRiskLevel(reportCount);
  // Community overrides the AI when >= 3 users have flagged it.
  const effectiveRisk: RiskLevel | null = communityRisk ?? riskLevel;

  // True if community says worse than AI.
  const communityOverride =
    communityRisk !== null &&
    (riskLevel === null ||
      riskLevel === "safe" ||
      (riskLevel === "suspicious" && communityRisk === "likely_scam"));

  const pageUrl = `${SITE_URL}/c/${entity.entity_type}/${entity.slug}`;
  const riskLabel = effectiveRisk ? RISK_LABEL[effectiveRisk] : "Unknown";
  const verdictSummary =
    (verdict as { summary?: string } | null)?.summary ??
    `Guardurai checked ${entity.display_name} ${entity.check_count} time${entity.check_count !== 1 ? "s" : ""}. Community verdict: ${riskLabel}.`;

  const lede = buildLede(entity, effectiveRisk, reportCount);
  const safety = SAFETY[entity.entity_type];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Is ${entity.display_name} a scam?`,
          acceptedAnswer: { "@type": "Answer", text: verdictSummary },
        },
      ],
      url: pageUrl,
      name: `Is ${entity.display_name} a scam?`,
      description: `Guardurai's verdict on ${entity.display_name}: ${riskLabel}.`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Guardurai", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: TYPE_LABEL[entity.entity_type],
          item: `${SITE_URL}/c/${entity.entity_type}`,
        },
        { "@type": "ListItem", position: 3, name: entity.display_name, item: pageUrl },
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Guardurai
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-slate-500">{TYPE_LABEL[entity.entity_type]}</li>
          <li aria-hidden>/</li>
          <li className="truncate text-slate-600">{entity.display_name}</li>
        </ol>
      </nav>

      <header className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {TYPE_ICON[entity.entity_type]}
          </span>
          <h1 className="break-all text-2xl font-bold tracking-tight text-slate-900">
            Is {entity.display_name} a scam?
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {effectiveRisk && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${RISK_CHIP[effectiveRisk]}`}
            >
              {RISK_LABEL[effectiveRisk]}
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

        <p className="text-[15px] leading-relaxed text-slate-600">{lede}</p>
      </header>

      {/* Community override banner — shown when users say it's worse than the AI thought */}
      {communityOverride && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            ⚠{" "}
            {communityRisk === "likely_scam"
              ? "Community verdict: this is a scam"
              : "Community reports say this is suspicious"}
          </p>
          <p className="mt-1 text-sm text-red-600">
            {reportCount} Guardurai user
            {reportCount !== 1 ? "s have" : " has"} flagged this — even though
            the AI analysis{" "}
            {riskLevel === "safe"
              ? "initially rated it safe"
              : "rated it less seriously"}
            . Trust the community here.
          </p>
        </div>
      )}

      {/* AI verdict */}
      {verdict && (
        <section className="mt-8">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Latest AI verdict
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

      {/* Flag + CTA */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <FlagAsScamButton
          entityType={entity.entity_type}
          slug={entity.slug}
          initialReportCount={reportCount}
        />
        <Link
          href={`/?q=${encodeURIComponent(entity.display_name)}`}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Run a fresh check →
        </Link>
      </div>

      {/* Evergreen safety guidance — substantive, crawlable content */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-slate-900">
          {safety.heading}
        </h2>
        <ul className="mt-3 space-y-2">
          {safety.points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-700">
              <span aria-hidden className="mt-0.5 shrink-0 text-blue-500">
                ✓
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          Unsure about something else?{" "}
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
            Check any message, link, or number free with Guardurai
          </Link>
          .
        </p>
      </section>

      {/* Community comments */}
      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Community reports
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({entityComments.length})
          </span>
        </h2>

        {entityComments.length > 0 ? (
          <div className="mb-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {entityComments.map((c) => (
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

      {/* Related checks — internal links for crawl depth + SEO */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Other {TYPE_NOUN[entity.entity_type]}s people are checking
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/c/${e.entity_type}/${e.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-blue-300"
                >
                  <span className="truncate text-slate-700">
                    Is {e.display_name} a scam?
                  </span>
                  {e.risk_level && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_CHIP[e.risk_level]}`}
                    >
                      {RISK_LABEL[e.risk_level]}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
