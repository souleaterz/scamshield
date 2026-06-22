import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";

/**
 * Optional account bar. Renders nothing until Clerk is configured, so the app
 * works for anonymous visitors out of the box.
 */
export default async function AuthHeader() {
  if (!isClerkConfigured()) return null;

  const userId = await getUserId();
  const tier = await getTierForUser(userId);
  // Only signed-in free users see Upgrade — paid users and protected family
  // members (who inherit Pro) don't, and signed-out visitors use Sign up.
  const showUpgrade = userId !== null && tier === "free";

  return (
    <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur">
      {showUpgrade && (
        <Link
          href="/pricing"
          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Upgrade
        </Link>
      )}
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        {tier === "family" && (
          <Link
            href="/family"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Family
          </Link>
        )}
        <Link
          href="/history"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          History
        </Link>
        <UserButton />
      </Show>
    </header>
  );
}
