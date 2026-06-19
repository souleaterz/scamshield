import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SCAM_GUIDES, getGuide } from "@/app/lib/scamGuides";
import { SITE_URL, SITE_NAME } from "@/app/lib/site";

export function generateStaticParams() {
  return SCAM_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return { title: "Scam guide not found | ScamShield" };

  const url = `${SITE_URL}/scams/${guide.slug}`;
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: guide.metaTitle,
      description: guide.metaDescription,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title: guide.metaTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function ScamGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav className="mb-8 text-sm text-slate-500">
        <Link href="/scams" className="text-blue-600 hover:text-blue-700">
          Common scams
        </Link>
        <span className="mx-2">/</span>
        <span>{guide.name}</span>
      </nav>

      <article>
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          {guide.category}
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {guide.name}
        </h1>
        <p className="mt-4 text-lg text-slate-700">{guide.intro}</p>

        {guide.exampleMessage && (
          <figure className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Example of a scam message
            </figcaption>
            <blockquote className="text-sm italic text-slate-600">
              “{guide.exampleMessage}”
            </blockquote>
          </figure>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
          <p className="mt-2 leading-relaxed text-slate-700">
            {guide.howItWorks}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900">Warning signs</h2>
          <ul className="mt-3 space-y-2">
            {guide.warningSigns.map((sign) => (
              <li key={sign} className="flex gap-2 text-slate-700">
                <span aria-hidden className="text-red-500">
                  •
                </span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900">What to do</h2>
          <ul className="mt-3 space-y-2">
            {guide.whatToDo.map((step) => (
              <li key={step} className="flex gap-2 text-slate-700">
                <span aria-hidden className="text-blue-500">
                  →
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </section>

        {guide.faqs.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900">
              Frequently asked questions
            </h2>
            <dl className="mt-3 space-y-4">
              {guide.faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="font-medium text-slate-900">{faq.question}</dt>
                  <dd className="mt-1 text-slate-700">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>

      <aside className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          Not sure about a message you&apos;ve received?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Paste it into ScamShield and get an instant verdict on whether
          it&apos;s a scam.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Check a message now
        </Link>
      </aside>
    </main>
  );
}
