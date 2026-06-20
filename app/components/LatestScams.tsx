import Link from "next/link";
import { getRecentRiskyEntities } from "@/app/lib/entityPages";
import type { EntityPage, EntityType } from "@/app/lib/entityPages";

const TYPE_ICON: Record<EntityType, string> = {
  domain: "🌐",
  phone: "📞",
  company: "🏢",
};

const RISK_BADGE: Record<string, { label: string; classes: string }> = {
  likely_scam: { label: "Likely scam", classes: "bg-red-100 text-red-700" },
  suspicious: { label: "Suspicious", classes: "bg-amber-100 text-amber-700" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function LatestScams() {
  const entities = await getRecentRiskyEntities();
  if (entities.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500"
          aria-hidden
        />
        Live — recently flagged
      </h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {entities.map((e: EntityPage) => {
          const badge = e.risk_level ? RISK_BADGE[e.risk_level] : null;
          return (
            <Link
              key={e.id}
              href={`/c/${e.entity_type}/${e.slug}`}
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50"
            >
              <span className="shrink-0" aria-hidden>
                {TYPE_ICON[e.entity_type] ?? "🔍"}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
                {e.display_name}
              </span>
              {badge && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.classes}`}
                >
                  {badge.label}
                </span>
              )}
              <span className="shrink-0 text-xs text-slate-400">
                {timeAgo(e.last_checked_at)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
