"use client";

import { useEffect, useState } from "react";
import { EXTENSION_URL } from "@/app/lib/site";

const STORAGE_KEY = "gurai-ext-cta-dismissed";

export default function ExtensionCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on Chrome desktop
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent);
    if (!isChrome) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Don't nag people who already have the extension. Its content script marks
    // the page with data-guardurai-extension — but at document_idle, which can
    // land after hydration, so we also watch for the marker arriving late.
    const installed = () =>
      document.documentElement.hasAttribute("data-guardurai-extension");
    if (installed()) return;

    const observer = new MutationObserver(() => {
      if (installed()) {
        setVisible(false);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-guardurai-extension"],
    });

    // Brief grace period so the banner doesn't flash before the marker appears.
    const timer = setTimeout(() => {
      if (!installed()) setVisible(true);
    }, 800);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
      <span className="text-lg" aria-hidden>🛡️</span>
      <p className="flex-1 text-slate-700">
        <span className="font-semibold text-slate-900">Get automatic protection.</span>{" "}
        The Guardurai extension warns you about scam pages before you click.
      </p>
      <a
        href={EXTENSION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        Install free →
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
    </div>
  );
}
