"use client";

import { useState } from "react";
import type { EntityType } from "@/app/lib/entityPages";

export default function FlagAsScamButton({
  entityType,
  slug,
  initialReportCount = 0,
}: {
  entityType: EntityType;
  slug: string;
  initialReportCount?: number;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [count, setCount] = useState(initialReportCount);

  if (entityType === "company") return null;

  async function flag() {
    setState("loading");
    const inputType = entityType === "phone" ? "phone" : "domain";
    const inputValue = entityType === "phone" ? `+${slug}` : slug;
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ inputType, inputValue }] }),
      });
      if (res.ok) {
        setState("done");
        setCount((c) => c + 1);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm font-medium text-red-600">
        ✓ Flagged — {count} {count === 1 ? "person has" : "people have"} now
        reported this
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {count > 0 && (
        <span className="text-sm font-medium text-red-600">
          🚩 {count} {count === 1 ? "person" : "people"} flagged this as a
          scam
        </span>
      )}
      <button
        onClick={flag}
        disabled={state === "loading"}
        className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50"
      >
        {state === "loading" ? "Flagging…" : "🚩 Flag as scam"}
      </button>
      {state === "error" && (
        <span className="text-xs text-red-500">Something went wrong.</span>
      )}
    </div>
  );
}
