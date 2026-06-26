"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return value;
}

function Stat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div className="flex-1 text-center">
      <div className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
        {shown.toLocaleString()}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default function GlobalStatsClient({
  pagesProtected,
  threatsBlocked,
}: {
  pagesProtected: number;
  threatsBlocked: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500"
          aria-hidden
        />
        Protecting people in real time
      </p>
      <div className="flex items-stretch gap-4">
        <Stat value={pagesProtected} label="Pages protected" />
        <div className="w-px self-stretch bg-slate-100" aria-hidden />
        <Stat value={threatsBlocked} label="Threats blocked" />
      </div>
    </section>
  );
}
