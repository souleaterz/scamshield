"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Verdict, ImageMediaType, Tier } from "@/app/lib/scamAnalysis";
import type { PersonVerificationResult } from "@/app/lib/imagePersonVerification";
import {
  parseEmailHeaders,
  looksLikeEmailHeaders,
  type EmailHeaderAnalysis,
} from "@/app/lib/emailHeaderParser";
import VerdictCard from "@/app/components/VerdictCard";
import PersonVerdictCard from "@/app/components/PersonVerdictCard";
import EmailHeaderCard from "@/app/components/EmailHeaderCard";
import ShareButton from "@/app/components/ShareButton";
import PricingPlans from "@/app/components/PricingPlans";
import AdSlot from "@/app/components/AdSlot";
import ManageBilling from "@/app/components/ManageBilling";

interface AttachedImage {
  media_type: ImageMediaType;
  data: string; // base64 without data-URL prefix
  previewUrl: string;
  name: string;
}

const ALLOWED_MEDIA_TYPES: ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function readImageFile(file: File): Promise<AttachedImage> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_MEDIA_TYPES.includes(file.type as ImageMediaType)) {
      reject(new Error("Unsupported image type. Use JPEG, PNG, GIF, or WebP."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({
        media_type: file.type as ImageMediaType,
        data: base64,
        previewUrl: result,
        name: file.name || "screenshot",
      });
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

type Mode = "check" | "verify" | "email";

export default function ScamChecker({
  tier,
  signedIn,
  clerkEnabled,
  justUpgraded = false,
}: {
  tier: Tier;
  signedIn: boolean;
  clerkEnabled: boolean;
  justUpgraded?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("check");
  const [text, setText] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [personResult, setPersonResult] = useState<PersonVerificationResult | null>(null);
  const [emailText, setEmailText] = useState("");
  const [emailAnalysis, setEmailAnalysis] = useState<EmailHeaderAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reportState, setReportState] = useState<"idle" | "working" | "done">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyInputRef = useRef<HTMLInputElement>(null);

  const showAds = tier === "free";

  // Show a full verdict passed in via the URL hash (e.g. "Open full result"
  // from the browser extension), without re-running the check.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.hash.match(/(?:^#|&)r=([^&]+)/);
    if (!match) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed && typeof parsed === "object" && parsed.risk_level) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hash is only readable on the client, after mount
        setVerdict(parsed as Verdict);
      }
    } catch {
      /* malformed hash — ignore */
    }
    // Tidy the URL so a refresh doesn't re-trigger it.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const attached = await readImageFile(files[0]);
      setImage(attached);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const file = Array.from(e.clipboardData.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        e.preventDefault();
        const list = {
          0: file,
          length: 1,
          item: () => file,
        } as unknown as FileList;
        void handleFiles(list);
      }
    },
    [handleFiles],
  );

  const canSubmit = (text.trim().length > 0 || image !== null) && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setVerdict(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          image: image
            ? { media_type: image.media_type, data: image.data }
            : undefined,
        }),
      });
      const payload = await res.json();
      if (res.status === 429) {
        setLimitReached(true);
        return;
      }
      if (!res.ok) {
        throw new Error(payload?.error ?? "Something went wrong.");
      }
      setVerdict(payload as Verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReport() {
    if (!verdict || reportState !== "idle") return;
    const items: { inputType: "domain" | "phone"; inputValue: string }[] = [];
    for (const c of verdict.link_checks ?? []) items.push({ inputType: "domain", inputValue: c.host });
    for (const c of verdict.phone_checks ?? []) items.push({ inputType: "phone", inputValue: c.e164 });
    if (items.length === 0) return;
    setReportState("working");
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      setReportState("done");
    } catch {
      setReportState("idle");
    }
  }

  function reset() {
    setText("");
    setImage(null);
    setVerdict(null);
    setPersonResult(null);
    setEmailText("");
    setEmailAnalysis(null);
    setError(null);
    setLimitReached(false);
    setReportState("idle");
  }

  async function handleEmailSubmit() {
    const trimmed = emailText.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setVerdict(null);
    setEmailAnalysis(null);

    // Parse headers client-side first (instant, no API cost)
    const analysis = looksLikeEmailHeaders(trimmed)
      ? parseEmailHeaders(trimmed)
      : null;
    setEmailAnalysis(analysis);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          // Prepend the hard parsed signals so Claude sees auth results
          emailContext: analysis?.signals,
        }),
      });
      const payload = await res.json();
      if (res.status === 429) { setLimitReached(true); return; }
      if (!res.ok) throw new Error(payload?.error ?? "Something went wrong.");
      setVerdict(payload as Verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    reset();
    setMode(next);
  }

  async function handleVerify() {
    if (!image || loading) return;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setPersonResult(null);
    try {
      const res = await fetch("/api/verify-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: { media_type: image.media_type, data: image.data } }),
      });
      const payload = await res.json();
      if (res.status === 429) {
        setLimitReached(true);
        return;
      }
      if (!res.ok) throw new Error(payload?.error ?? "Something went wrong.");
      setPersonResult(payload as PersonVerificationResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {tier !== "free" && <ManageBilling />}

      {justUpgraded && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
          You&apos;re upgraded — thank you! Your new plan is active.
        </div>
      )}

      {/* Mode tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {(
            [
              { id: "check", label: "Check Content" },
              { id: "email", label: "📧 Email Headers" },
              { id: "verify", label: "🕵️ Verify Photo" },
            ] as { id: Mode; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMode(id)}
              className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                mode === id
                  ? id === "verify"
                    ? "border-b-2 border-violet-600 text-violet-600 bg-violet-50/50"
                    : id === "email"
                      ? "border-b-2 border-amber-500 text-amber-700 bg-amber-50/50"
                      : "border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Check mode ── */}
        {mode === "check" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
            className={`p-4 transition-colors ${dragging ? "bg-blue-50" : ""}`}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste the suspicious text, link, or phone number here…"
              rows={6}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            {image && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={image.name} className="h-12 w-12 rounded object-cover" />
                <span className="flex-1 truncate text-sm text-slate-600">{image.name}</span>
                <button type="button" onClick={() => setImage(null)} className="text-sm font-medium text-slate-400 hover:text-slate-600">
                  Remove
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                + Add screenshot or image
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
              <div className="flex gap-2">
                {(text || image || verdict) && (
                  <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading ? "Checking…" : "Check for scams"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Email Headers mode ── */}
        {mode === "email" && (
          <div className="p-4">
            <p className="mb-3 text-sm text-slate-500">
              Paste the <strong>full email source</strong> or just the raw headers to check for spoofing, phishing, and authentication failures.
              In Gmail: open the email → More options (⋮) → <strong>Show original</strong> → copy everything.
            </p>
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder={"Received: from mail.example.com...\nAuthentication-Results: ...\nFrom: Support <support@suspicious-domain.com>\nSubject: Your account has been compromised\n..."}
              rows={8}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
            <div className="mt-3 flex justify-end gap-2">
              {(emailText || verdict || emailAnalysis) && (
                <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleEmailSubmit}
                disabled={!emailText.trim() || loading}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Analysing…" : "Analyse email"}
              </button>
            </div>
          </div>
        )}

        {/* ── Verify mode ── */}
        {mode === "verify" && (
          <div className="p-4">
            <p className="mb-4 text-sm text-slate-500">
              Upload a profile photo to check if it&apos;s a real person — we run reverse image search, AI-generation detection, and visual analysis.
            </p>

            {!image ? (
              <button
                type="button"
                onClick={() => verifyInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void handleFiles(e.dataTransfer.files);
                }}
                className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors ${
                  dragging
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40"
                }`}
              >
                <span className="text-3xl">🖼️</span>
                <span className="text-sm font-medium text-slate-600">
                  Drop a profile photo here, or click to upload
                </span>
                <span className="text-xs text-slate-400">JPEG, PNG, WebP, GIF · max ~5 MB</span>
              </button>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={image.name} className="h-20 w-20 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{image.name}</p>
                  <button type="button" onClick={() => setImage(null)} className="mt-1 text-xs text-slate-400 hover:text-slate-600">
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input ref={verifyInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />

            <div className="mt-3 flex justify-end gap-2">
              {(image || personResult) && (
                <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleVerify}
                disabled={!image || loading}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Analysing…" : "Verify this photo"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {limitReached && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              You&apos;ve used today&apos;s free check
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              The free plan includes 1 check per day. Upgrade for more checks,
              the full red-flag breakdown, and an ad-free experience.
            </p>
          </div>
          <div className="mt-5">
            <PricingPlans signedIn={signedIn} clerkEnabled={clerkEnabled} />
          </div>
        </div>
      )}

      {emailAnalysis && <EmailHeaderCard analysis={emailAnalysis} />}

      {verdict && (
        <div className="space-y-3">
          <VerdictCard verdict={verdict} />
          <div className="flex items-center justify-between gap-3">
            {(() => {
              const hasIdentifiers =
                (verdict.link_checks?.length ?? 0) > 0 ||
                (verdict.phone_checks?.length ?? 0) > 0;
              if (!hasIdentifiers) return <span />;
              return (
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={reportState !== "idle"}
                  className={`text-sm font-medium transition-colors ${
                    reportState === "done"
                      ? "cursor-default text-emerald-600"
                      : reportState === "working"
                        ? "cursor-wait text-slate-400"
                        : "text-slate-500 hover:text-red-600"
                  }`}
                >
                  {reportState === "done"
                    ? "✓ Reported — thank you"
                    : reportState === "working"
                      ? "Reporting…"
                      : "🚩 Report as scam"}
                </button>
              );
            })()}
            <ShareButton verdict={verdict} />
          </div>
        </div>
      )}

      {personResult && (
        <PersonVerdictCard result={personResult} />
      )}

      {showAds && !verdict && !personResult && !limitReached && <AdSlot />}
    </>
  );
}
