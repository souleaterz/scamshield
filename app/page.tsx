import { Suspense } from "react";
import Link from "next/link";
import ScamChecker from "@/app/components/ScamChecker";
import GuarduraiMascot from "@/app/components/GuarduraiMascot";
import LatestScams from "@/app/components/LatestScams";
import GlobalStats from "@/app/components/GlobalStats";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const userId = await getUserId();
  const tier = await getTierForUser(userId);
  const justUpgraded = (await searchParams).upgraded === "1";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:py-14">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
        <GuarduraiMascot size={96} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Guardurai
          </h1>
          <p className="mt-1 text-slate-600">
            Paste anything — a message, a link, a phone number, or a screenshot —
            and find out if it&apos;s a scam.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Or add the free{" "}
            <span className="font-medium text-slate-500">Chrome extension</span>{" "}
            for automatic, real-time protection as you browse.
          </p>
        </div>
      </header>

      <ScamChecker
        tier={tier}
        signedIn={userId !== null}
        clerkEnabled={isClerkConfigured()}
        justUpgraded={justUpgraded}
      />

      <Suspense fallback={null}>
        <GlobalStats />
      </Suspense>

      <Suspense fallback={null}>
        <LatestScams />
      </Suspense>

      <footer className="mt-auto space-y-2 pt-6 text-center text-xs text-slate-400">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="text-slate-500">Browse reported scams:</span>
          <Link href="/c/domain" className="font-medium text-blue-600 hover:text-blue-700">
            Websites
          </Link>
          <span aria-hidden>·</span>
          <Link href="/c/phone" className="font-medium text-blue-600 hover:text-blue-700">
            Phone numbers
          </Link>
          <span aria-hidden>·</span>
          <Link href="/c/company" className="font-medium text-blue-600 hover:text-blue-700">
            Companies
          </Link>
        </p>
        <p>
          <Link
            href="/scams"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Common scams &amp; how to spot them
          </Link>
        </p>
        <p>
          Guardurai gives guidance, not a guarantee. When in doubt, contact the
          organisation directly using details you trust.
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/about" className="hover:text-slate-600">
            About
          </Link>
          <span aria-hidden>·</span>
          <Link href="/pricing" className="hover:text-slate-600">
            Pricing
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-slate-600">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/redeem" className="hover:text-slate-600">
            Redeem a code
          </Link>
        </p>
      </footer>
    </main>
  );
}
