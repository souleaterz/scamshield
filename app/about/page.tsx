import type { Metadata } from "next";
import Link from "next/link";
import GuarduraiMascot from "@/app/components/GuarduraiMascot";
import { SITE_URL } from "@/app/lib/site";

const EXTENSION_URL = "https://chromewebstore.google.com/detail/guardurai";

export const metadata: Metadata = {
  title: "About Guardurai — AI scam protection for you and your family",
  description:
    "Guardurai protects you and the people you love from scams — real-time warnings on dangerous sites, instant AI checks on any message, and alerts when a loved one is at risk. Free to start.",
  alternates: { canonical: `${SITE_URL}/about` },
};

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "🛡️",
    title: "Real-time site protection",
    body: "Our browser extension warns you the moment you land on a known scam or phishing site — before you click, type, or pay. Free, for everyone.",
  },
  {
    icon: "💬",
    title: "Check any message instantly",
    body: "Paste a text, email, DM, or screenshot and get an instant AI verdict — Safe, Suspicious, or Likely Scam — with the red flags explained in plain English.",
  },
  {
    icon: "🔗",
    title: "Link & website checks",
    body: "We inspect domain age, hidden redirects, look-alike brand names, and cross-check Google Safe Browsing and live malware databases.",
  },
  {
    icon: "📞",
    title: "Phone number intelligence",
    body: "Spot premium-rate traps, spoofed numbers, and numbers other people have already reported as scams.",
  },
  {
    icon: "💖",
    title: "Romance & catfish detection",
    body: "Reverse-image search on profile photos plus AI deepfake detection answers the real question: is this person who they say they are?",
  },
  {
    icon: "🏢",
    title: "Company & investment checks",
    body: "Verify UK companies against Companies House and the FCA register before you hand over a penny.",
  },
  {
    icon: "📧",
    title: "Email that's built in",
    body: "A one-click check button inside Gmail, Outlook, Yahoo, iCloud and more — scan a suspicious email without leaving your inbox.",
  },
  {
    icon: "👥",
    title: "Community scam database",
    body: "Every scam reported by our community — and pulled from live threat feeds — makes the next person safer.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex-1">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-12 text-center sm:pt-20">
        <div className="flex justify-center">
          <GuarduraiMascot size={104} />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Scammers are clever.
          <br />
          <span className="text-blue-600">Guardurai is cleverer.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Instant AI scam checks, real-time protection as you browse, and alerts
          when someone you love is at risk. Stop second-guessing every message,
          link, and caller — let Guardurai watch your back.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="w-full rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
          >
            Check something now — free
          </Link>
          <a
            href={EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 sm:w-auto"
          >
            Add free browser protection
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          No card needed. Real-time protection is free, forever.
        </p>
      </section>

      {/* ── Real-time protection band ────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Always on
            </span>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Protection that never blinks
            </h2>
            <p className="mt-3 text-slate-600">
              You won&apos;t always think to check. That&apos;s the point. With
              the Guardurai extension installed, we quietly watch every page you
              open and throw up a clear red warning the instant you hit a site
              that&apos;s flagged as a scam — phishing pages, fake shops, dodgy
              prize claims, the lot.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                "Warns you before you enter details or pay",
                "Works on every site, in the background",
                "Powered by live threat feeds + our community",
                "Completely free — no account required",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-blue-500">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span className="font-semibold text-red-800">
                Warning: this site is flagged as a scam
              </span>
            </div>
            <p className="mt-2 text-sm text-red-600">
              Flagged by the URLhaus malware database. Do not enter personal
              details or payment information.
            </p>
            <div className="mt-4 h-2 w-2/3 rounded-full bg-red-200" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-red-200" />
            <p className="mt-4 text-right text-xs font-medium text-red-400">
              Guardurai — real-time protection
            </p>
          </div>
        </div>
      </section>

      {/* ── Family band (the emotional core) ─────────────────────────────── */}
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Guardurai Family
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            The ones scammers target most
            <br />
            are the ones you love most
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Your mum. Your dad. Your gran. Fraudsters go after them precisely
            because they&apos;re trusting — and because no one&apos;s watching.
            Now you can be.
          </p>

          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-left shadow-sm">
            <p className="text-sm font-semibold text-emerald-700">
              📨 You&apos;ll get an email like this:
            </p>
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                ⚠️ Mum may have hit a scam
              </p>
              <p className="mt-1 text-sm text-red-600">
                Mum just encountered something Guardurai flagged as a likely
                scam. You may want to check in before she takes any action.
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              The moment a protected loved one runs into danger, you know — so
              you can step in before any money is lost.
            </p>
          </div>

          <ul className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-2">
            {[
              "Protect up to 5 people",
              "Instant email alerts when they're at risk",
              "Each person gets full protection too",
              "Set up in two minutes with a simple invite link",
            ].map((t) => (
              <li
                key={t}
                className="flex gap-2 rounded-lg bg-white/70 p-3 text-sm text-slate-700"
              >
                <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                {t}
              </li>
            ))}
          </ul>

          <Link
            href="/pricing"
            className="mt-8 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Protect your family — £9.99/mo
          </Link>
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            One app. Every kind of scam.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Texts, emails, fake shops, romance scams, dodgy investments, spoofed
            calls — if it&apos;s a scam, Guardurai sees through it.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-2xl" aria-hidden>
                {f.icon}
              </div>
              <h3 className="mt-2 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Email-in-inbox band ──────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-4xl gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
          {/* Gmail-style mock with the Guardurai button */}
          <div className="order-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:order-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-white">
                  ?
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    Your account is on hold — verify now
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    security-team@paypa1-alerts.com
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Dear customer, we detected unusual activity. Click the link below
                within 24 hours to avoid suspension…
              </p>
              <button className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow">
                🛡️ Check with Guardurai
              </button>
            </div>
          </div>

          <div className="order-1 sm:order-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Right inside your inbox
            </span>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Check suspicious emails without leaving Gmail
            </h2>
            <p className="mt-3 text-slate-600">
              A &ldquo;Check with Guardurai&rdquo; button appears right on the
              email. One click reads the sender and the message, runs the full
              scam analysis, and shows you the verdict — no copy-pasting, no
              switching tabs. Built into{" "}
              <strong>Gmail, Outlook, Yahoo, iCloud, Proton and AOL</strong>.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                "One click — we pull the sender and body for you",
                "Catches spoofed senders and look-alike domains",
                "Spot phishing before you click a single link",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-blue-500">✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <a
              href={EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Add it to your inbox — free
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Protected in three steps
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Check anything",
                b: "Paste a message, link, number, or screenshot — get a verdict in seconds.",
              },
              {
                n: "2",
                t: "Add the extension",
                b: "Get automatic, real-time warnings as you browse. Free, forever.",
              },
              {
                n: "3",
                t: "Cover your family",
                b: "Invite the people you love and get alerted the moment they're at risk.",
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Stop scammers before they start
        </h2>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          Free to use, takes seconds, and could save you — or someone you love —
          thousands.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="w-full rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
          >
            Try it free
          </Link>
          <Link
            href="/pricing"
            className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 sm:w-auto"
          >
            See plans
          </Link>
        </div>
        <p className="mt-8 text-xs text-slate-400">
          Guardurai gives guidance, not a guarantee. When in doubt, contact the
          organisation directly using details you trust.
        </p>
      </section>
    </main>
  );
}
