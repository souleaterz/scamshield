import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getEntitiesByType } from "@/app/lib/entityPages";
import type { EntityType } from "@/app/lib/entityPages";
import type { RiskLevel } from "@/app/lib/scamAnalysis";
import { SITE_URL } from "@/app/lib/site";

export const revalidate = 3600;

const VALID_TYPES: EntityType[] = ["domain", "phone", "company"];

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

const HUB: Record<
  EntityType,
  { title: string; noun: string; intro: string }
> = {
  domain: {
    title: "Scam websites & domains",
    noun: "websites",
    intro:
      "Websites and domains that Guardurai users and threat databases have flagged as scams or phishing. Search a site below, or check any address yourself for an instant verdict.",
  },
  phone: {
    title: "Scam phone numbers",
    noun: "phone numbers",
    intro:
      "Phone numbers reported for scam calls and texts. If a number below has called you, see what others found — or check any number yourself in seconds.",
  },
  company: {
    title: "Scam & suspicious companies",
    noun: "companies",
    intro:
      "Companies and firms flagged as scams, clone firms, or unauthorised. Always verify a company against Companies House and the FCA register before parting with money.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as EntityType)) return { title: "Not found — Guardurai" };
  const hub = HUB[type as EntityType];
  const title = `${hub.title} — checked & reported | Guardurai`;
  const description = hub.intro;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/c/${type}` },
    openGraph: { title, description, url: `${SITE_URL}/c/${type}` },
  };
}

export default async function HubPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as EntityType)) notFound();
  const t = type as EntityType;
  const hub = HUB[t];
  const entities = await getEntitiesByType(t, 60);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Guardurai
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-slate-600">{hub.title}</li>
        </ol>
      </nav>

      <header className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {hub.title}
        </h1>
        <p className="mt-2 text-slate-600">{hub.intro}</p>
      </header>

      {entities.length > 0 ? (
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {entities.map((e) => (
            <li key={e.id}>
              <Link
                href={`/c/${e.entity_type}/${e.slug}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-blue-300"
              >
                <span className="truncate text-slate-700">{e.display_name}</span>
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
      ) : (
        <p className="mt-8 text-sm text-slate-500">
          No {hub.noun} flagged yet.
        </p>
      )}

      <div className="mt-10 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
        <p className="text-sm text-blue-900">
          Worried about a specific {hub.noun.replace(/s$/, "")}?
        </p>
        <Link
          href="/"
          className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Check it free with Guardurai →
        </Link>
      </div>
    </main>
  );
}
