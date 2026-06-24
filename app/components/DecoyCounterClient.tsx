"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number): { value: string; unit: string } {
  if (seconds < 120) return { value: String(seconds), unit: seconds === 1 ? "second" : "seconds" };
  const mins = Math.floor(seconds / 60);
  if (mins < 120) return { value: String(mins), unit: mins === 1 ? "minute" : "minutes" };
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 48) {
    const display = remMins > 0 ? `${hours}h ${remMins}m` : String(hours);
    return { value: display, unit: remMins > 0 ? "wasted" : hours === 1 ? "hour" : "hours" };
  }
  const days = Math.floor(hours / 24);
  return { value: String(days), unit: days === 1 ? "day" : "days" };
}

export default function DecoyCounterClient({
  totalSecondsWasted,
  totalSessions,
}: {
  totalSecondsWasted: number;
  totalSessions: number;
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (totalSecondsWasted === 0) return;
    const duration = 1400;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * totalSecondsWasted));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalSecondsWasted]);

  const { value, unit } = formatTime(displayed);

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-center">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-500">
        🪤 Scammer time wasted
      </p>
      <p className="text-3xl font-bold tabular-nums text-violet-700">
        {value}{" "}
        <span className="text-xl font-semibold text-violet-500">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-violet-400">
        by {totalSessions.toLocaleString()} Guardurai{" "}
        {totalSessions === 1 ? "decoy" : "decoys"} deployed
      </p>
    </div>
  );
}
