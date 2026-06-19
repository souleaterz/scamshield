"use client";

import Link from "next/link";
import type { HistoryItem } from "@/app/api/history/route";

const RISK_STYLES: Record<string, { chip: string; label: string }> = {
  safe: { chip: "bg-emerald-100 text-emerald-700", label: "Safe" },
  suspicious: { chip: "bg-amber-100 text-amber-700", label: "Suspicious" },
  likely_scam: { chip: "bg-red-100 text-red-700", label: "Likely Scam" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryList({ checks }: { checks: HistoryItem[] }) {
  if (checks.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-slate-500">No checks yet.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Run your first check
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {checks.map((c) => {
        const style =
          RISK_STYLES[c.risk_level] ?? RISK_STYLES.suspicious;
        return (
          <li
            key={c.id}
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:gap-4"
          >
            <span
              className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}
            >
              {style.label}
            </span>
            <div className="min-w-0 flex-1">
              {c.detected_type && (
                <span className="mr-2 text-xs font-medium text-slate-400">
                  {c.detected_type}
                </span>
              )}
              <span className="text-sm text-slate-700">
                {c.summary ?? "No summary available."}
              </span>
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {relativeTime(c.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
