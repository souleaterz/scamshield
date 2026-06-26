"use client";

import type { PersonVerificationResult } from "@/app/lib/imagePersonVerification";

/** Hostname for display, tolerant of malformed URLs. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const VERDICT_CONFIG = {
  likely_real: {
    label: "Likely Real",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  suspicious: {
    label: "Suspicious",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  likely_fake: {
    label: "Likely Fake",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
};

function ScoreRing({ score, verdict }: { score: number; verdict: PersonVerificationResult["verdict"] }) {
  const cfg = VERDICT_CONFIG[verdict];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);

  const strokeColor =
    verdict === "likely_real"
      ? "#10b981"
      : verdict === "suspicious"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="46" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">
          {score}
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#64748b">
          / 100
        </text>
      </svg>
      <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
        Real Score
      </span>
    </div>
  );
}

export default function PersonVerdictCard({
  result,
}: {
  result: PersonVerificationResult;
}) {
  const cfg = VERDICT_CONFIG[result.verdict];

  const directFlags = result.flags.filter(
    (f) =>
      !result.claudeAnalysis.aiSigns.includes(f) &&
      !result.claudeAnalysis.stockPhotoSigns.includes(f),
  );

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5`}>
        <div className="flex items-center gap-5">
          <ScoreRing score={result.realScore} verdict={result.verdict} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white ${
                  result.verdict === "likely_real"
                    ? "bg-emerald-500"
                    : result.verdict === "suspicious"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              >
                {cfg.label}
              </span>
              <span className="text-xs text-slate-500">Profile photo analysis</span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800 leading-snug">
              {result.summary}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {result.claudeAnalysis.assessment}
            </p>
          </div>
        </div>
      </div>

      {/* Top-level flags (reverse image + Sightengine) */}
      {directFlags.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-red-600">
            🚨 Hard signals
          </h3>
          <ul className="space-y-1.5">
            {directFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-red-500 flex-shrink-0">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What the checks found */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* AI generation check */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              AI Detection
            </span>
            {result.aiDetection ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                  result.aiDetection.aiScore >= 0.55
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }`}
              >
                {Math.round(result.aiDetection.aiScore * 100)}%
              </span>
            ) : (
              <span className="text-xs text-slate-400">Not run</span>
            )}
          </div>
          {result.aiDetection ? (
            <p className="text-xs text-slate-600">
              {result.aiDetection.aiScore >= 0.85
                ? "Very high probability of AI generation."
                : result.aiDetection.aiScore >= 0.55
                  ? "Elevated AI generation probability."
                  : result.aiDetection.aiScore >= 0.3
                    ? "Some AI generation signals present."
                    : "Low AI generation probability."}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Add SIGHTENGINE_USER + SIGHTENGINE_SECRET to enable Sightengine AI detection.
            </p>
          )}
        </div>

        {/* Reverse image search */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Reverse Image
            </span>
            {result.reverseImage ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                  result.reverseImage.matchCount > 10
                    ? "bg-red-500"
                    : result.reverseImage.matchCount > 3
                      ? "bg-amber-500"
                      : "bg-slate-400"
                }`}
              >
                {result.reverseImage.matchCount} match
                {result.reverseImage.matchCount !== 1 ? "es" : ""}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Not run</span>
            )}
          </div>
          {result.reverseImage ? (
            <p className="text-xs text-slate-600">
              {result.reverseImage.matchCount === 0
                ? "No web matches found — image may be new or private."
                : result.reverseImage.exactMatchCount > 0
                  ? `${result.reverseImage.exactMatchCount} exact copies found across the web.`
                  : `${result.reverseImage.matchCount} pages contain this or a similar image.`}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Add GOOGLE_CLOUD_VISION_KEY to enable Google web image search.
            </p>
          )}
        </div>

        {/* Claude visual analysis */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Visual Analysis
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                result.claudeAnalysis.claudeAiScore >= 60
                  ? "bg-red-500"
                  : result.claudeAnalysis.claudeAiScore >= 30
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
            >
              AI score {result.claudeAnalysis.claudeAiScore}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {result.claudeAnalysis.faceDetected
              ? "Face detected. Visual AI analysis complete."
              : "No clear face detected in this image."}
          </p>
        </div>
      </div>

      {/* AI artifacts noticed by Claude */}
      {result.claudeAnalysis.aiSigns.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            Visual AI artifacts
          </h3>
          <ul className="space-y-1">
            {result.claudeAnalysis.aiSigns.map((sign, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-red-400 flex-shrink-0">▸</span>
                {sign}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stock photo signs */}
      {result.claudeAnalysis.stockPhotoSigns.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            Professional/stock photo signs
          </h3>
          <ul className="space-y-1">
            {result.claudeAnalysis.stockPhotoSigns.map((sign, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-amber-400 flex-shrink-0">▸</span>
                {sign}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Possible real profiles — social/dating/professional pages using this photo */}
      {result.reverseImage && result.reverseImage.profileMatches.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700">
            👤 Possible profiles using this photo
          </h3>
          <p className="mb-2.5 text-xs text-slate-600">
            This image was found on these social or dating sites. Open them to
            check whether they belong to the person you&apos;re talking to — or
            reveal the photo&apos;s real owner.
          </p>
          <ul className="space-y-2">
            {result.reverseImage.profileMatches.map((match, i) => (
              <li key={i} className="text-xs">
                <a
                  href={match.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-700 hover:underline break-all"
                >
                  {hostnameOf(match.url)}
                </a>
                {match.title && (
                  <span className="ml-1 text-slate-500 break-all">— {match.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Web matches (excluding the profile matches shown above) */}
      {result.reverseImage &&
        (() => {
          const profileUrls = new Set(
            result.reverseImage.profileMatches.map((m) => m.url),
          );
          const otherMatches = result.reverseImage.topMatches.filter(
            (m) => !profileUrls.has(m.url),
          );
          if (otherMatches.length === 0) return null;
          return (
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                Other pages where this image appears
              </h3>
              <ul className="space-y-2">
                {otherMatches.slice(0, 8).map((match, i) => (
                  <li key={i} className="text-xs">
                    <a
                      href={match.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {match.title ?? match.url}
                    </a>
                    <span className="ml-1 text-slate-400 break-all">
                      — {hostnameOf(match.url)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

      {/* Advice */}
      {result.advice.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-blue-700">
            What to do
          </h3>
          <ul className="space-y-1.5">
            {result.advice.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                <span className="mt-0.5 flex-shrink-0 font-bold">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
