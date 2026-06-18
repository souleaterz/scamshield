import ScamChecker from "@/app/components/ScamChecker";
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl" aria-hidden>
            🛡️
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ScamShield
          </h1>
        </div>
        <p className="mt-2 text-slate-600">
          Paste anything — a message, a link, a phone number, or a screenshot —
          and find out if it&apos;s a scam.
        </p>
      </header>

      <ScamChecker
        tier={tier}
        signedIn={userId !== null}
        clerkEnabled={isClerkConfigured()}
        justUpgraded={justUpgraded}
      />

      <footer className="mt-auto pt-6 text-center text-xs text-slate-400">
        ScamShield gives guidance, not a guarantee. When in doubt, contact the
        organisation directly using details you trust.
      </footer>
    </main>
  );
}
