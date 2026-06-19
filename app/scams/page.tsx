import type { Metadata } from "next";
import Link from "next/link";
import { SCAM_GUIDES } from "@/app/lib/scamGuides";
import { SITE_URL } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Common Scams: How to Spot and Avoid Them | Guardurai",
  description:
    "Plain-English guides to the most common UK scams — fake delivery texts, HMRC refunds, 'Hi Mum' messages, bank impersonation and more. Learn the warning signs.",
  alternates: { canonical: `${SITE_URL}/scams` },
};

export default function ScamsIndexPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-blue-600 hover:text-blue-700">
          ← Back to the scam checker
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Common scams and how to spot them
        </h1>
        <p className="mt-3 text-slate-600">
          Quick, plain-English guides to the scams people in the UK see most.
          Each one explains how it works, the warning signs, and what to do.
          Unsure about a specific message?{" "}
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
            Check it with Guardurai
          </Link>
          .
        </p>
      </header>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {SCAM_GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/scams/${guide.slug}`}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {guide.category}
              </span>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {guide.name}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{guide.intro}</p>
              <span className="mt-3 inline-block text-sm font-medium text-blue-600">
                Read the guide →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
