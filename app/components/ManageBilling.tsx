"use client";

import { useState } from "react";

/** Opens the Stripe billing portal for the current user (cancel / update card). */
export default function ManageBilling() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error ?? "Couldn't open billing.");
    } catch {
      setError("Couldn't open billing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {error && <span className="text-xs text-slate-500">{error}</span>}
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60"
      >
        {busy ? "Opening…" : "Manage subscription"}
      </button>
    </div>
  );
}
