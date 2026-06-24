import Link from "next/link";
import type { Metadata } from "next";
import { getPrankTranscripts } from "@/app/lib/decoyTranscripts";
import { getDecoyStats } from "@/app/lib/decoyStats";
import { formatDuration } from "@/app/lib/decoyTranscripts";
import { PrankThread } from "@/app/components/PrankThread";

export const metadata: Metadata = {
  title: "Scammer Pranks — Guardurai",
  description:
    "Real conversations where Guardurai decoys waste scammers' time with fake personas. Time wasted, one scammer at a time.",
};

// Refresh the gallery a few times an hour; transcripts aren't time-critical.
export const revalidate = 600;

export default async function PranksPage() {
  const [stats, transcripts] = await Promise.all([
    getDecoyStats(),
    getPrankTranscripts(30),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:py-14">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          🪤 Scammer Pranks
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-slate-600">
          When Guardurai spots a scam, it can deploy a fake persona to string the
          scammer along — wasting the time they&apos;d spend on real victims.
          Here&apos;s what our decoys have been up to.
        </p>
        {stats.totalSecondsWasted > 0 && (
          <p className="mt-4 inline-block rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700">
            {formatDuration(stats.totalSecondsWasted)} of scammer time wasted
            across {stats.totalSessions.toLocaleString()} decoys
          </p>
        )}
      </header>

      {transcripts.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
          No prank transcripts yet — check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {transcripts.map((t) => (
            <Link key={t.id} href={`/pranks/${t.id}`} className="block">
              <PrankThread t={t} collapsed />
            </Link>
          ))}
        </div>
      )}

      <footer className="mt-auto pt-6 text-center text-xs text-slate-400">
        <p>
          Conversations are anonymised. All personas and details are entirely
          synthetic.
        </p>
        <p className="mt-2">
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
            ← Back to Guardurai
          </Link>
        </p>
      </footer>
    </main>
  );
}
