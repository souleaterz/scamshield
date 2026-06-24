import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrankTranscript, formatDuration } from "@/app/lib/decoyTranscripts";
import { PrankThread } from "@/app/components/PrankThread";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const t = await getPrankTranscript((await params).id);
  if (!t) return { title: "Prank not found — Guardurai" };
  return {
    title: `${t.name}'s decoy wasted ${formatDuration(t.secondsWasted)} of a scammer's time — Guardurai`,
    description: `A Guardurai decoy strung a scammer along for ${formatDuration(t.secondsWasted)} across ${t.messageCount} messages.`,
  };
}

export default async function PrankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getPrankTranscript((await params).id);
  if (!t) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:py-14">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">
          🪤 Decoy transcript
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {t.name} wasted {formatDuration(t.secondsWasted)} of a scammer&apos;s time
        </h1>
      </header>

      <PrankThread t={t} />

      <footer className="mt-auto space-y-2 pt-6 text-center text-xs text-slate-400">
        <p>Anonymised. All personas and details are entirely synthetic.</p>
        <p className="flex flex-wrap items-center justify-center gap-x-3">
          <Link href="/pranks" className="font-medium text-blue-600 hover:text-blue-700">
            ← All pranks
          </Link>
          <span aria-hidden>·</span>
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
            Guardurai home
          </Link>
        </p>
      </footer>
    </main>
  );
}
