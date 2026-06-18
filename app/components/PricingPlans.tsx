"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import type { PaidTier } from "@/app/lib/stripe";

interface Plan {
  tier: PaidTier;
  name: string;
  price: string;
  perks: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    tier: "pro",
    name: "Pro",
    price: "£4.99/mo",
    perks: ["More checks per day", "Full red-flag breakdown", "No ads"],
    highlight: true,
  },
  {
    tier: "unlimited",
    name: "Unlimited",
    price: "£9.99/mo",
    perks: ["Unlimited checks", "Everything in Pro", "30-day history"],
  },
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

  // Anonymous visitors can't subscribe — prompt sign-in first instead of
  // letting them click through to a confusing "please sign in" error.
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

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`rounded-xl border bg-white p-5 text-left ${
              plan.highlight ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h4 className="font-semibold text-slate-900">{plan.name}</h4>
              <span className="text-sm font-medium text-slate-700">
                {plan.price}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex gap-2 text-sm text-slate-600">
                  <span aria-hidden className="text-blue-500">
                    ✓
                  </span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            {(() => {
              const className = `mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                plan.highlight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`;
              if (needsSignIn) {
                return (
                  <SignInButton mode="modal" forceRedirectUrl="/">
                    <button type="button" className={className}>
                      Sign in to choose {plan.name}
                    </button>
                  </SignInButton>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => upgrade(plan.tier)}
                  disabled={busy !== null}
                  className={className}
                >
                  {busy === plan.tier ? "Starting…" : `Choose ${plan.name}`}
                </button>
              );
            })()}
          </div>
        ))}
      </div>
      {message && (
        <p className="mt-3 text-center text-sm text-slate-500">{message}</p>
      )}
    </div>
  );
}
