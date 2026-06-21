import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/app/lib/site";

const EFFECTIVE_DATE = "22 June 2026";
const CONTACT_EMAIL = "support@guardurai.com";

export const metadata: Metadata = {
  title: "Privacy Policy | Guardurai",
  description:
    "How Guardurai collects, uses, and protects your data when you check messages, links, phone numbers, and companies for scams.",
  alternates: { canonical: `${SITE_URL}/privacy` },
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

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-blue-600 hover:text-blue-700">
          ← Back to Guardurai
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {EFFECTIVE_DATE}
        </p>
      </header>

      <p className="mt-6 text-sm leading-relaxed text-slate-700">
        Guardurai (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps you check whether a
        message, link, phone number, image, or company is likely to be a scam.
        This policy explains what we collect, why, and the choices you have. We
        are the data controller for the purposes of UK GDPR.
      </p>

      <Section title="What we collect">
        <p>
          <strong>Content you submit for a check.</strong> When you paste text,
          a link, a phone number, or upload an image, we send it to our analysis
          providers to generate a verdict. We do{" "}
          <strong>not</strong> store the raw content of your checks. We retain
          only the resulting <em>verdict metadata</em> — for example the risk
          level, a short summary, and the type of content checked.
        </p>
        <p>
          <strong>Account information.</strong> If you create an account, our
          authentication provider (Clerk) stores your email address and sign-in
          details. We never see or store your password.
        </p>
        <p>
          <strong>Payment information.</strong> Paid plans are handled by Stripe.
          Stripe processes your card details directly — we never receive or
          store your full card number. We keep a record of your subscription
          status and plan.
        </p>
        <p>
          <strong>Usage and technical data.</strong> We record limited data such
          as your IP address (used to enforce free-tier rate limits and prevent
          abuse), the number of checks performed, and basic request logs.
        </p>
        <p>
          <strong>Community reports.</strong> If you flag something as a scam or
          leave a comment, we store the text you submit and a one-way reference
          derived from your IP to prevent spam. Comments are public.
        </p>
      </Section>

      <Section title="How we use your data">
        <ul className="list-disc space-y-1 pl-5">
          <li>To analyse the content you submit and return a scam verdict.</li>
          <li>To enforce usage limits and prevent abuse of the service.</li>
          <li>To manage your account and subscription.</li>
          <li>
            To maintain a community scam database that warns other users about
            numbers and websites reported as fraudulent.
          </li>
          <li>To improve the accuracy and reliability of our checks.</li>
        </ul>
      </Section>

      <Section title="Who we share data with">
        <p>
          We use trusted third-party processors to run the service. The content
          of a check may be sent to one or more of these depending on what you
          submit:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Anthropic</strong> (Claude AI) — analyses submitted content
            to produce a verdict.
          </li>
          <li>
            <strong>Clerk</strong> — account authentication.
          </li>
          <li>
            <strong>Stripe</strong> — subscription payments.
          </li>
          <li>
            <strong>Supabase</strong> — database hosting (verdict metadata,
            community reports, subscription status).
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and request logs.
          </li>
          <li>
            <strong>Google</strong> (Safe Browsing, Cloud Vision) — link
            reputation and reverse-image checks.
          </li>
          <li>
            <strong>Sightengine</strong> — AI-generated / deepfake image
            detection.
          </li>
          <li>
            Public registers (<strong>Companies House</strong>,{" "}
            <strong>FCA</strong>) and threat databases (
            <strong>URLhaus</strong>) for company and link verification.
          </li>
        </ul>
        <p>
          We do not sell your personal data. We only share it as needed to
          provide the service or where required by law.
        </p>
      </Section>

      <Section title="Data retention">
        <p>
          Raw check content is not retained beyond the time needed to produce a
          verdict. Verdict metadata, community reports, and account/subscription
          records are kept for as long as your account is active or as needed to
          provide the service and meet legal obligations. You can ask us to
          delete your account data at any time.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under UK GDPR you have the right to access, correct, or delete your
          personal data, to object to or restrict processing, and to data
          portability. To exercise any of these rights, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            {CONTACT_EMAIL}
          </a>
          . You also have the right to complain to the UK Information
          Commissioner&rsquo;s Office (ICO).
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use essential cookies to keep you signed in and to operate the
          service. We do not use advertising cookies for tracking across other
          websites. If we introduce advertising on the free tier in future, we
          will update this policy and request consent where required.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Guardurai is not intended for children under 13, and we do not
          knowingly collect their data.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by the &ldquo;last updated&rdquo; date above.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data? Email us at{" "}
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
        <Link href="/terms" className="text-blue-600 hover:text-blue-700">
          Terms of Service
        </Link>
        .
      </p>
    </main>
  );
}
