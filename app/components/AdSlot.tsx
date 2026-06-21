"use client";

import { useEffect, useRef } from "react";

/**
 * Free-tier ad unit (Adsterra Native Banner). Only rendered for free users —
 * Pro/Family never see it. The loader script populates the container div by id.
 *
 * Native Banner is a brand-safe display format (no popunders/redirects), which
 * matters for a scam-protection product.
 */
const SCRIPT_SRC =
  "https://pl29832580.effectivecpmnetwork.com/7f9700ac6364a2b6c77f9698155f5d9c/invoke.js";
const CONTAINER_ID = "container-7f9700ac6364a2b6c77f9698155f5d9c";

export default function AdSlot() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = SCRIPT_SRC;
    script.setAttribute("data-cfasync", "false");
    el.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-center">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Advertisement · upgrade to remove
      </p>
      <div id={CONTAINER_ID} ref={containerRef} />
    </div>
  );
}
