import type { PrankTranscript } from "@/app/lib/decoyTranscripts";
import { formatDuration } from "@/app/lib/decoyTranscripts";

const FLAG: Record<string, string> = { GB: "🇬🇧", US: "🇺🇸", AU: "🇦🇺", CA: "🇨🇦" };

export function PrankThread({
  t,
  collapsed = false,
}: {
  t: PrankTranscript;
  collapsed?: boolean;
}) {
  const shown = collapsed ? t.messages.slice(0, 4) : t.messages;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-violet-50 px-4 py-3">
        <span aria-hidden>{FLAG[t.country] ?? "🌐"}</span>
        <span className="text-sm font-semibold text-violet-800">
          {t.name}
          {t.town ? ` from ${t.town}` : ""}
        </span>
        <span className="ml-auto text-xs font-medium text-violet-600">
          🪤 {formatDuration(t.secondsWasted)} wasted · {t.messageCount} msgs
        </span>
      </div>

      <div className="space-y-2 p-4">
        {shown.map((m, i) => (
          <div
            key={i}
            className={
              m.direction === "outbound"
                ? "ml-8 rounded-2xl rounded-br-sm bg-violet-100 px-3 py-2 text-sm text-violet-900"
                : "mr-8 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-700"
            }
          >
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">
              {m.direction === "outbound" ? "Decoy" : "Scammer"}
            </div>
            <div className="whitespace-pre-wrap break-words">{m.body}</div>
          </div>
        ))}
        {collapsed && t.messages.length > shown.length && (
          <div className="pt-1 text-center text-xs font-medium text-violet-600">
            + {t.messages.length - shown.length} more messages
          </div>
        )}
      </div>
    </div>
  );
}
