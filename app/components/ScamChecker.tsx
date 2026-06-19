"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Verdict, ImageMediaType, Tier } from "@/app/lib/scamAnalysis";
import VerdictCard from "@/app/components/VerdictCard";
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
  const [text, setText] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function reset() {
    setText("");
    setImage(null);
    setVerdict(null);
    setError(null);
    setLimitReached(false);
  }

  return (
    <>
      {tier !== "free" && <ManageBilling />}

      {justUpgraded && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
          You&apos;re upgraded — thank you! Your new plan is active.
        </div>
      )}

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
          dragging ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
        }`}
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
            <img
              src={image.previewUrl}
              alt={image.name}
              className="h-12 w-12 rounded object-cover"
            />
            <span className="flex-1 truncate text-sm text-slate-600">
              {image.name}
            </span>
            <button
              type="button"
              onClick={() => setImage(null)}
              className="text-sm font-medium text-slate-400 hover:text-slate-600"
            >
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
          <div className="flex gap-2">
            {(text || image || verdict) && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
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
      </section>

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

      {verdict && <VerdictCard verdict={verdict} />}

      {showAds && !verdict && !limitReached && <AdSlot />}
    </>
  );
}
