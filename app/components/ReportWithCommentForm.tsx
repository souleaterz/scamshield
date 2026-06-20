"use client";

import { useState } from "react";
import Link from "next/link";

export default function ReportWithCommentForm({
  phones,
  domains,
}: {
  phones: string[];
  domains: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [entityUrls, setEntityUrls] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasEntities = phones.length > 0 || domains.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (comment.trim().length < 10) {
      setError("Please write at least 10 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flag-and-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phones,
          domains,
          comment: comment.trim(),
          authorName: name.trim() || null,
        }),
      });
      const data = (await res.json()) as { success?: boolean; entityUrls?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit.");
      setEntityUrls(data.entityUrls ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (entityUrls !== null) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-800">
          ✓ Thank you — your report has been recorded.
        </p>
        {entityUrls.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-red-600">
              Your comment is now visible on the community page{entityUrls.length !== 1 ? "s" : ""} for these numbers/sites:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {entityUrls.map((url) => (
                <Link
                  key={url}
                  href={url}
                  className="text-sm font-medium text-red-700 underline hover:text-red-900"
                >
                  {url}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-red-600">
            Your feedback will help improve future verdicts.
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
      >
        🚩 AI got it wrong? Mark as scam and tell us why
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-red-800">
            Flag this as a scam
          </p>
          <p className="text-xs text-red-600">
            Your report will be visible on the public community page and will
            help improve future verdicts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-red-400 hover:text-red-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What happened? How did you receive this? Why are you sure it's a scam? (min 10 characters)"
          rows={4}
          maxLength={500}
          required
          className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional — shows as 'Anonymous' if blank)"
          maxLength={60}
          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-red-400">{comment.length}/500</span>
          {error && <p className="text-xs text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading || comment.trim().length < 10}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
}
