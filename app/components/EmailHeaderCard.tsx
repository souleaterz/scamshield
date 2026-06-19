"use client";

import type { EmailHeaderAnalysis } from "@/app/lib/emailHeaderParser";

function AuthBadge({ label, result }: { label: string; result: string | null }) {
  const state =
    result === "pass"
      ? "pass"
      : result === "fail"
        ? "fail"
        : result === "softfail"
          ? "softfail"
          : "unknown";

  const cfg = {
    pass: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "✓" },
    fail: { bg: "bg-red-100", text: "text-red-700", icon: "✗" },
    softfail: { bg: "bg-amber-100", text: "text-amber-700", icon: "~" },
    unknown: { bg: "bg-slate-100", text: "text-slate-500", icon: "—" },
  }[state];

  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 ${cfg.bg}`}>
      <span className={`font-bold ${cfg.text}`}>{cfg.icon}</span>
      <div>
        <div className={`text-xs font-bold ${cfg.text}`}>{label}</div>
        <div className={`text-xs ${cfg.text} opacity-80`}>
          {result ?? "not checked"}
        </div>
      </div>
    </div>
  );
}

export default function EmailHeaderCard({
  analysis,
}: {
  analysis: EmailHeaderAnalysis;
}) {
  const allPass =
    analysis.auth?.spf === "pass" &&
    analysis.auth?.dkim === "pass" &&
    analysis.auth?.dmarc === "pass" &&
    analysis.flags.length === 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <span className="text-lg">📋</span>
        <div>
          <div className="text-sm font-semibold text-slate-800">
            Email header analysis
          </div>
          {analysis.subject && (
            <div className="text-xs text-slate-500 truncate max-w-sm">
              {analysis.subject}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Auth results */}
        {analysis.auth ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Authentication
            </p>
            <div className="flex flex-wrap gap-2">
              <AuthBadge label="SPF" result={analysis.auth.spf} />
              <AuthBadge label="DKIM" result={analysis.auth.dkim} />
              <AuthBadge label="DMARC" result={analysis.auth.dmarc} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No Authentication-Results header found — headers may be incomplete or not yet processed by a mail server.
          </p>
        )}

        {/* Sender info */}
        {analysis.from && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Sender
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="w-20 flex-shrink-0 text-xs text-slate-400">From</span>
                <span className="text-slate-700 break-all">
                  {analysis.from.displayName
                    ? `${analysis.from.displayName} <${analysis.from.email}>`
                    : analysis.from.email}
                </span>
              </div>
              {analysis.replyTo && (
                <div className="flex gap-2">
                  <span className="w-20 flex-shrink-0 text-xs text-slate-400">Reply-To</span>
                  <span
                    className={`break-all ${
                      analysis.replyTo.domain !== analysis.from?.domain
                        ? "font-medium text-red-600"
                        : "text-slate-700"
                    }`}
                  >
                    {analysis.replyTo.email}
                    {analysis.replyTo.domain !== analysis.from?.domain && (
                      <span className="ml-1 text-xs font-bold text-red-500">
                        ← different domain!
                      </span>
                    )}
                  </span>
                </div>
              )}
              {analysis.returnPath && analysis.returnPath.email !== "<>" && (
                <div className="flex gap-2">
                  <span className="w-20 flex-shrink-0 text-xs text-slate-400">Return-Path</span>
                  <span
                    className={`break-all ${
                      analysis.returnPath.domain !== analysis.from?.domain
                        ? "text-amber-700"
                        : "text-slate-500"
                    }`}
                  >
                    {analysis.returnPath.email}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="w-20 flex-shrink-0 text-xs text-slate-400">Relay hops</span>
                <span className={`text-sm ${analysis.receivedCount > 7 ? "text-amber-700 font-medium" : "text-slate-500"}`}>
                  {analysis.receivedCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        {analysis.flags.length > 0 ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">
              🚨 Authentication red flags
            </p>
            <ul className="space-y-1.5">
              {analysis.flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-800">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        ) : allPass ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-700">
              ✓ All authentication checks passed — no spoofing signals in the headers.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
