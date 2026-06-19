import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import type { HistoryItem } from "@/app/api/history/route";
import HistoryList from "./HistoryList";

export const metadata = { title: "Check history — ScamShield" };

export default async function HistoryPage() {
  const userId = await getUserId();

  if (!userId) {
    redirect("/");
  }

  const supabase = getSupabaseAdmin();
  let checks: HistoryItem[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("usage_checks")
      .select("id, risk_level, detected_type, summary, tier, created_at")
      .eq("identifier", `user:${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) checks = (data ?? []) as HistoryItem[];
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Check history</h1>
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New check
        </Link>
      </div>

      <HistoryList checks={checks} />

      <p className="mt-6 text-center text-xs text-slate-400">
        Showing your last {checks.length} check{checks.length !== 1 ? "s" : ""}.
        Raw input is never stored — only the verdict headline.
      </p>
    </main>
  );
}
