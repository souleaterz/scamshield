"use client";

import { useState } from "react";
import type { Verdict } from "@/app/lib/scamAnalysis";

type Status = "idle" | "working" | "copied" | "error";

export default function ShareButton({ verdict }: { verdict: Verdict }) {
  const [status, setStatus] = useState<Status>("idle");

  async function share() {
    setStatus("working");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_level: verdict.risk_level,
          confidence: verdict.confidence,
          detected_type: verdict.detected_type,
          summary: verdict.summary,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.error || "Share failed");

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Guardurai verdict",
            text: verdict.summary,
            url: data.url,
          });
          setStatus("idle");
          return;
        } catch {
          // user cancelled the share sheet — fall through to copy
        }
      }
      await navigator.clipboard.writeText(data.url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const label =
    status === "working"
      ? "Creating link…"
      : status === "copied"
        ? "Link copied!"
        : status === "error"
          ? "Couldn't share"
          : "Share result";

  return (
    <button
      type="button"
      onClick={share}
      disabled={status === "working"}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      <span aria-hidden>🔗</span>
      {label}
    </button>
  );
}
