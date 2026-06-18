/**
 * Free-tier ad placeholder. Drop the real Google AdSense unit in here once the
 * publisher account is approved and the domain is live, e.g.:
 *
 *   <ins className="adsbygoogle" data-ad-client="ca-pub-XXXX" data-ad-slot="YYYY" />
 *   (plus the loader <script> in app/layout.tsx)
 */
export default function AdSlot() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Advertisement
      </p>
      <p className="mt-1 text-sm text-slate-400">
        Ad space — upgrade to Pro to remove ads.
      </p>
    </div>
  );
}
