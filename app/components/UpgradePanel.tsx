import Link from "next/link";

/** Shown in place of a paid feature for free users. */
export default function UpgradePanel({
  icon,
  title,
  description,
  bullets,
}: {
  icon: string;
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <span className="mt-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
        Pro feature
      </span>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{description}</p>

      {bullets && bullets.length > 0 && (
        <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-slate-700">
              <span aria-hidden className="mt-0.5 shrink-0 text-blue-500">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/pricing"
        className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        Upgrade to unlock
      </Link>
    </div>
  );
}
