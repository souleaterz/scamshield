import type { Metadata } from "next";
import Link from "next/link";
import GuarduraiMascot from "@/app/components/GuarduraiMascot";
import { SITE_URL } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Welcome to Guardurai — you're now protected",
  description:
    "Your Guardurai scam protection is installed. Here's how to use it to stay safe from scams and phishing.",
  alternates: { canonical: `${SITE_URL}/welcome` },
  robots: { index: false }, // post-install page, not for search
};

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: "🛡️",
    title: "You're protected automatically",
    body: "As you browse, Guardurai checks pages against a live scam database and shows a red warning if you land on a known scam or phishing site. Nothing to switch on — it just works.",
  },
  {
    icon: "🖱️",
    title: "Check anything with a right-click",
    body: "See a suspicious message, link, or number? Select the text, right-click, and choose “Check with Guardurai” for an instant verdict.",
  },
  {
    icon: "📧",
    title: "Check emails inside your inbox",
    body: "Open a dodgy email in Gmail, Outlook, Yahoo, iCloud, Proton or AOL and click the “Check with Guardurai” button that appears — no copy-pasting.",
  },
  {
    icon: "🔎",
    title: "Use the toolbar button anytime",
    body: "Click the Guardurai icon in your toolbar to paste anything for a check or scan the page you're on.",
  },
];

export default function WelcomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
      <div className="text-center">
        <div className="flex justify-center">
          <GuarduraiMascot size={88} />
        </div>
        <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          ✓ Extension installed
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          You&apos;re protected. Here&apos;s how to use it.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          Guardurai is now watching your back as you browse. Three quick things
          to know:
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">
              {s.icon}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                {s.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pin tip */}
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        💡 <span className="font-semibold">Tip:</span> click the puzzle-piece icon
        in your toolbar and pin Guardurai so it&apos;s always one click away.
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="w-full rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
        >
          Try your first check
        </Link>
        <Link
          href="/pricing"
          className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 sm:w-auto"
        >
          Protect your family
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Real-time protection is free. By using Guardurai you agree to our{" "}
        <Link href="/terms" className="text-blue-600 hover:text-blue-700">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
          Privacy Policy
        </Link>
        . Guardurai gives guidance, not a guarantee.
      </p>
    </main>
  );
}
