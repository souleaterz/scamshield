import type { Metadata } from "next";
import Link from "next/link";
import GuarduraiMascot from "@/app/components/GuarduraiMascot";
import { SITE_URL, EXTENSION_URL } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "You're all set — Guardurai",
  description: "Your Guardurai plan is active. Here's how to get protected.",
  alternates: { canonical: `${SITE_URL}/get-started` },
  robots: { index: false },
};

const TIER_LABEL: Record<string, string> = { pro: "Pro", family: "Family" };

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const tier = (await searchParams).tier ?? "";
  const label = TIER_LABEL[tier] ?? "";

  const steps: { icon: string; title: string; body: string; cta?: { href: string; text: string; external?: boolean } }[] = [
    {
      icon: "🧩",
      title: "Install the browser extension",
      body: "This is the heart of Guardurai. It checks pages as you browse and throws up a big red warning the moment you land on a known scam or phishing site — automatically.",
      cta: { href: EXTENSION_URL, text: "Add to Chrome — free", external: true },
    },
    {
      icon: "🖱️",
      title: "Check anything in one click",
      body: "Got a dodgy text, link, email or phone number? Paste it on the site (or right-click it in your browser) for an instant AI verdict on whether it's a scam.",
      cta: { href: "/", text: "Try a check now" },
    },
    ...(tier === "family"
      ? [
          {
            icon: "👨‍👩‍👧",
            title: "Add the people you want to protect",
            body: "Your Family plan lets you watch over loved ones — you'll get an email the moment one of them runs into a likely scam, so you can step in before any harm is done.",
            cta: { href: "/family", text: "Set up family protection" },
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
      <div className="text-center">
        <div className="flex justify-center">
          <GuarduraiMascot size={88} />
        </div>
        <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          🎉 {label ? `${label} unlocked` : "You're all set"}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome to Guardurai{label ? ` ${label}` : ""}!
        </h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          Your protection is active. Guardurai helps you spot scams, phishing,
          fake companies and dodgy phone numbers before they catch you out.
          Here&apos;s how to get the most from it:
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">
              {s.icon}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">
                <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                {s.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
            {s.cta && (
              <a
                href={s.cta.href}
                {...(s.cta.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                {s.cta.text}
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        💡 <span className="font-semibold">Don&apos;t skip the extension</span> —
        it&apos;s what protects you automatically as you browse. The one-click
        checks are great, but the extension is always watching your back.
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          Go to my dashboard →
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Your plan runs for the period shown when you redeemed and then returns to
        the free plan — no card was charged. By using Guardurai you agree to our{" "}
        <Link href="/terms" className="text-blue-600 hover:text-blue-700">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
