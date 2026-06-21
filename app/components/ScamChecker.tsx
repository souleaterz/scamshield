"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Verdict, ImageMediaType, Tier } from "@/app/lib/scamAnalysis";
import type { PersonVerificationResult } from "@/app/lib/imagePersonVerification";
import {
  parseEmailHeaders,
  looksLikeEmailHeaders,
  type EmailHeaderAnalysis,
} from "@/app/lib/emailHeaderParser";
import type { CompanyCheckResult } from "@/app/lib/companyCheck";
import VerdictCard from "@/app/components/VerdictCard";
import PersonVerdictCard from "@/app/components/PersonVerdictCard";
import EmailHeaderCard from "@/app/components/EmailHeaderCard";
import CompanyVerdictCard from "@/app/components/CompanyVerdictCard";
import ShareButton from "@/app/components/ShareButton";
import ReportWithCommentForm from "@/app/components/ReportWithCommentForm";
import PricingPlans from "@/app/components/PricingPlans";
import ManageBilling from "@/app/components/ManageBilling";

interface AttachedImage {
  media_type: ImageMediaType;
  data: string;
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

type Mode = "check" | "company";

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
  const [emailAnalysis, setEmailAnalysis] = useState<EmailHeaderAnalysis | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResult, setCompanyResult] = useState<CompanyCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect email headers live as the user types
  const headersDetected =
    text.length > 60 && looksLikeEmailHeaders(text.trim());

  // Show a verdict passed in via the URL hash (e.g. "Open full result" from the extension).
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
    setPersonResult(null);
    setEmailAnalysis(null);

    const trimmed = text.trim();

    // Auto-detect and parse email headers — instant, no API cost
    const analysis =
      trimmed && looksLikeEmailHeaders(trimmed)
        ? parseEmailHeaders(trimmed)
        : null;
    if (analysis) setEmailAnalysis(analysis);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed || undefined,
          image: image
            ? { media_type: image.media_type, data: image.data }
            : undefined,
          emailContext: analysis?.signals,
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

  async function handleVerify() {
    if (!image || loading) return;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setVerdict(null);
    setPersonResult(null);
    setEmailAnalysis(null);
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

  function reset() {
    setText("");
    setImage(null);
    setVerdict(null);
    setPersonResult(null);
    setEmailAnalysis(null);
    setCompanyQuery("");
    setCompanyResult(null);
    setError(null);
    setLimitReached(false);
  }

  function switchMode(next: Mode) {
    reset();
    setMode(next);
  }

  async function handleCompanyCheck() {
    const trimmed = companyQuery.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setCompanyResult(null);
    try {
      const res = await fetch("/api/check-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const payload = await res.json();
      if (res.status === 429) { setLimitReached(true); return; }
      if (!res.ok) throw new Error(payload?.error ?? "Something went wrong.");
      setCompanyResult(payload as CompanyCheckResult);
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
        <div className="flex border-b border-slate-200">
          {(
            [
              { id: "check", label: "🛡️ Check Anything" },
              { id: "company", label: "🏢 Check Company" },
            ] as { id: Mode; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMode(id)}
              className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                mode === id
                  ? id === "company"
                    ? "border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50"
                    : "border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Check Anything mode ── */}
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
              placeholder="Paste anything suspicious — a message, link, phone number, or even full email headers…"
              rows={6}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            {/* Email headers auto-detected badge */}
            {headersDetected && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <span aria-hidden>📧</span>
                Email headers detected — authentication analysis will run automatically
              </div>
            )}

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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              <div className="flex flex-wrap gap-2">
                {(text || image || verdict || personResult) && (
                  <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    Clear
                  </button>
                )}
                {/* Show "Verify this person" only when an image is attached */}
                {image && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Analysing…" : "🕵️ Verify this person"}
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

            {/* Hint when only image is attached and no text */}
            {image && !text && (
              <p className="mt-2 text-xs text-slate-400">
                Use <span className="font-medium">Check for scams</span> to analyse the image content, or <span className="font-medium">Verify this person</span> to check if it&apos;s a real person (profile photos).
              </p>
            )}
          </div>
        )}

        {/* ── Company mode ── */}
        {mode === "company" && (
          <div className="p-4">
            <p className="mb-3 text-sm text-slate-500">
              Enter a UK company name, Companies House number (e.g. <strong>12345678</strong> or <strong>SC123456</strong>), or FCA Firm Reference Number to check if it&apos;s legitimate.
            </p>
            <input
              type="text"
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleCompanyCheck(); }}
              placeholder="e.g. Acme Investments Ltd, 12345678, or FCA FRN 123456"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <div className="mt-3 flex justify-end gap-2">
              {(companyQuery || companyResult) && (
                <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleCompanyCheck}
                disabled={!companyQuery.trim() || loading}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Checking…" : "Check company"}
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
          <div className="flex justify-end">
            <ShareButton verdict={verdict} />
          </div>
          <ReportWithCommentForm
            phones={(verdict.phone_checks ?? []).map((c) => c.e164)}
            domains={(verdict.link_checks ?? []).map((c) => c.host)}
          />
        </div>
      )}

      {personResult && (
        <PersonVerdictCard result={personResult} />
      )}

      {companyResult && (
        <CompanyVerdictCard result={companyResult} />
      )}
    </>
  );
}
