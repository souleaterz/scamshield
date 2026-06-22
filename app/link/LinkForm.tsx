"use client";

import { useState } from "react";

export default function LinkForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const errors: Record<string, string> = {
    invalid: "That code doesn't look right. It's 6 letters and numbers.",
    expired: "That code has expired. Open the desktop app and get a fresh one.",
    signin: "Please sign in first.",
    unavailable: "Service temporarily unavailable. Try again shortly.",
    failed: "Something went wrong. Please try again.",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/desktop/link/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
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

  if (state === "done") {
    return (
      <div className="text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-xl font-bold text-slate-900">Device linked</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your Guardurai desktop app is now connected to your account. You can
          close this page — the app will update automatically.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-center">
      <div className="text-4xl">🔗</div>
      <h2 className="mt-3 text-xl font-bold text-slate-900">Link your desktop app</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter the 6-character code shown in your Guardurai desktop app.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ABC123"
        autoFocus
        className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] uppercase text-slate-900 focus:border-blue-500 focus:outline-none"
      />
      {state === "error" && (
        <p className="mt-3 text-sm text-red-600">{message}</p>
      )}
      <button
        type="submit"
        disabled={state === "loading" || code.length !== 6}
        className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading" ? "Linking…" : "Link device"}
      </button>
    </form>
  );
}
