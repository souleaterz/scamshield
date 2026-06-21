import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/app/lib/site";

const EFFECTIVE_DATE = "22 June 2026";
const CONTACT_EMAIL = "support@guardurai.com";

export const metadata: Metadata = {
  title: "Terms of Service | Guardurai",
  description:
    "The terms that govern your use of Guardurai's scam-checking service, including subscriptions, acceptable use, and disclaimers.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-blue-600 hover:text-blue-700">
          ← Back to Guardurai
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {EFFECTIVE_DATE}
        </p>
      </header>

      <p className="mt-6 text-sm leading-relaxed text-slate-700">
        These terms govern your use of Guardurai (the &ldquo;Service&rdquo;). By
        using the Service or its browser extension, you agree to these terms. If
        you do not agree, please do not use the Service.
      </p>

      <Section title="What Guardurai does">
        <p>
          Guardurai uses AI and public data sources to assess whether a message,
          link, phone number, image, or company is likely to be a scam. It
          provides an opinion to help you make a decision.
        </p>
      </Section>

      <Section title="Guidance, not a guarantee">
        <p>
          <strong>
            Guardurai provides guidance, not a guarantee.
          </strong>{" "}
          Our verdicts are automated assessments and may be wrong — both
          false positives (flagging something safe) and false negatives (missing
          a real scam) are possible. You are responsible for your own decisions.
          Always verify independently before sending money, sharing personal
          details, or acting on a message, and contact the relevant organisation
          using details you trust. Guardurai is not a substitute for
          professional, legal, or financial advice.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          Some features require an account. You are responsible for keeping your
          login secure and for activity under your account. You must provide
          accurate information and be at least 13 years old to use the Service.
        </p>
      </Section>

      <Section title="Subscriptions and billing">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The free tier allows a limited number of checks per day. Paid plans
            (Pro) unlock additional checks and features.
          </li>
          <li>
            Pro is billed at £4.99 per month. New subscriptions may include a
            3-day free trial; you will not be charged if you cancel before the
            trial ends.
          </li>
          <li>
            Subscriptions renew automatically each month until cancelled. You
            can cancel any time from your billing settings; access continues
            until the end of the current paid period.
          </li>
          <li>
            Except where required by law, payments are non-refundable for
            partial billing periods. Prices may change with notice.
          </li>
          <li>Payments are processed securely by Stripe.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Use the Service to break the law, harass others, or submit content
            you have no right to share.
          </li>
          <li>
            Attempt to disrupt, overload, reverse-engineer, or bypass the limits
            or security of the Service.
          </li>
          <li>
            Resell or commercially redistribute verdicts without our written
            permission.
          </li>
          <li>
            Submit knowingly false community reports to defame a person or
            business.
          </li>
        </ul>
      </Section>

      <Section title="Community content">
        <p>
          Community reports and comments you submit are public. You are
          responsible for what you post and grant us a licence to display and
          store it as part of the Service. We may remove content that is
          abusive, unlawful, or knowingly false.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The Service, including its branding, design, and content, belongs to
          Guardurai. These terms do not grant you any ownership of it.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any
          kind. To the fullest extent permitted by law, Guardurai is not liable
          for any loss arising from your reliance on a verdict, from scams we
          fail to detect, or from interruptions to the Service. Nothing in these
          terms excludes liability that cannot be excluded by law.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate access if you breach these terms or misuse the Service.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of England and Wales, and any
          disputes are subject to the exclusive jurisdiction of its courts.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Email us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 text-xs text-slate-400">
        See also our{" "}
        <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
