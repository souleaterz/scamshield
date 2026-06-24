"use client";

import { useState } from "react";

export default function RedeemForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ tier: string; expiresAt: string } | null>(null);

  const errors: Record<string, string> = {
    invalid: "That code isn't valid. Check for typos and try again.",
    used: "That code has already been redeemed.",
    signin: "Please sign in first.",
    unavailable: "Service temporarily unavailable. Try again shortly.",
    failed: "Something went wrong. Please try again.",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({ tier: data.tier, expiresAt: data.expiresAt });
        setState("done");
      } else {
        setState("error");
        setMessage(errors[data.error] ?? errors.failed);
      }
    } catch {
      setState("error");
      setMessage(errors.failed);
    }
  }

  if (state === "done" && result) {
    const tierLabel = result.tier === "family" ? "Family" : "Pro";
    const until = new Date(result.expiresAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-3 text-xl font-bold text-slate-900">
          {tierLabel} unlocked!
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your Guardurai {tierLabel} access is active until <strong>{until}</strong>.
          No card was charged — it simply ends on that date unless you subscribe.
        </p>
        <a
          href="/"
          className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Start using {tierLabel} →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-center">
      <div className="text-4xl">🎁</div>
      <h2 className="mt-3 text-xl font-bold text-slate-900">Redeem your code</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter the code from your purchase to unlock a month of Guardurai — no
        card needed.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX-XXXX"
        autoFocus
        className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-lg font-bold tracking-[0.2em] uppercase text-slate-900 focus:border-blue-500 focus:outline-none"
      />
      {state === "error" && <p className="mt-3 text-sm text-red-600">{message}</p>}
      <button
        type="submit"
        disabled={state === "loading" || code.trim().length < 6}
        className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading" ? "Redeeming…" : "Redeem code"}
      </button>
    </form>
  );
}
