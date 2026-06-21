import type { Metadata } from "next";
import Link from "next/link";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import { SITE_URL } from "@/app/lib/site";
import PricingPlans from "@/app/components/PricingPlans";

export const metadata: Metadata = {
  title: "Plans & pricing | Guardurai",
  description:
    "Free real-time scam protection for everyone. Upgrade to Pro for unlimited checks, or Family to protect up to 5 people with guardian alerts.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default async function PricingPage() {
  const userId = await getUserId();
  const tier = await getTierForUser(userId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-blue-600 hover:text-blue-700">
          ← Back to the scam checker
        </Link>
      </nav>

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Plans &amp; pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Real-time scam-site protection is free for everyone. Upgrade when you
          want unlimited deep checks, advanced photo &amp; company checks, or to
          protect the people you love.
        </p>
      </header>

      {tier !== "free" && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-800">
          You&apos;re on the{" "}
          <strong>{tier === "family" ? "Family" : "Pro"}</strong> plan — thank
          you!{" "}
          {tier === "family" && (
            <Link href="/family" className="font-medium underline">
              Manage your family
            </Link>
          )}
        </div>
      )}

      <div className="mt-10">
        <PricingPlans
          signedIn={userId !== null}
          clerkEnabled={isClerkConfigured()}
        />
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-slate-400">
        Prices in GBP, billed monthly, cancel any time. Guardurai gives
        guidance, not a guarantee — always verify independently before acting.
      </p>
    </main>
  );
}
