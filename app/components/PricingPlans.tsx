"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import type { PaidTier } from "@/app/lib/stripe";

const PERKS = [
  "3-day free trial — cancel any time",
  "Unlimited scam checks (free plan: 3 per day)",
  "Full red-flag breakdown (advanced AI model)",
  "Photo & identity checks — spot romance & catfish scams",
  "Company & FCA register checks",
  "Check history + no ads",
];

const FAMILY_PERKS = [
  "Everything in Pro, for up to 5 people",
  "Protect parents, kids & relatives",
  "Email alerts when a loved one hits a scam",
  "Step in before any money is lost",
];

export default function PricingPlans({
  signedIn,
  clerkEnabled,
}: {
  signedIn: boolean;
  clerkEnabled: boolean;
}) {
  const [busy, setBusy] = useState<PaidTier | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const needsSignIn = !signedIn && clerkEnabled;

  async function upgrade(tier: PaidTier) {
    setBusy(tier);
    setMessage(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setMessage(data?.error ?? "Couldn't start checkout. Please try again.");
    } catch {
      setMessage("Couldn't start checkout. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const btnClass =
    "mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pro */}
        <div className="rounded-2xl border border-blue-300 bg-white p-6 ring-2 ring-blue-100 text-left">
          <span className="inline-block rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
            Pro
          </span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900">£4.99</span>
            <span className="text-sm text-slate-500">/month</span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-blue-700">
            Free for the first 3 days
          </p>

          <ul className="mt-4 space-y-2.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="mt-0.5 shrink-0 text-blue-500">✓</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          {needsSignIn ? (
            <SignInButton mode="modal" forceRedirectUrl="/">
              <button type="button" className={btnClass}>
                Sign in to start free trial
              </button>
            </SignInButton>
          ) : (
            <button
              type="button"
              onClick={() => upgrade("pro")}
              disabled={busy !== null}
              className={btnClass}
            >
              {busy === "pro" ? "Starting…" : "Start 3-day free trial"}
            </button>
          )}
        </div>

        {/* Family */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left">
          <span className="inline-block rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
            Family
          </span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900">£9.99</span>
            <span className="text-sm text-slate-500">/month</span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-emerald-700">
            Protect up to 5 people
          </p>

          <ul className="mt-4 space-y-2.5">
            {FAMILY_PERKS.map((perk) => (
              <li key={perk} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          {needsSignIn ? (
            <SignInButton mode="modal" forceRedirectUrl="/">
              <button
                type="button"
                className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Sign in to choose Family
              </button>
            </SignInButton>
          ) : (
            <button
              type="button"
              onClick={() => upgrade("family")}
              disabled={busy !== null}
              className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "family" ? "Starting…" : "Choose Family"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        <span className="font-medium text-slate-600">Free plan</span> includes
        real-time scam-site protection for everyone — plus 3 checks a day.
      </p>

      {message && (
        <p className="mt-3 text-center text-sm text-slate-500">{message}</p>
      )}
    </div>
  );
}
