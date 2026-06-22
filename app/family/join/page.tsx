import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import { acceptInvite } from "@/app/lib/family";

export const metadata = { title: "Accept family invite — Guardurai" };

const ERRORS: Record<string, string> = {
  invalid: "That invite link isn't valid or has expired.",
  revoked: "This invite has been cancelled.",
  self: "You can't protect yourself — ask the person who sent this to use their own account.",
  unavailable: "Service temporarily unavailable. Please try again shortly.",
  failed: "Something went wrong accepting the invite.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const userId = await getUserId();

  let state: "no-code" | "need-signin" | "ok" | "error" = "ok";
  let errorMsg = "";

  if (!code) {
    state = "no-code";
  } else if (!userId) {
    state = isClerkConfigured() ? "need-signin" : "error";
    if (state === "error") errorMsg = ERRORS.unavailable;
  } else {
    const result = await acceptInvite(code, userId);
    if (!result.ok) {
      state = "error";
      errorMsg = ERRORS[result.error ?? "failed"] ?? ERRORS.failed;
    }
  }

  const here = `/family/join${code ? `?code=${encodeURIComponent(code)}` : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        {state === "ok" && (
          <>
            <div className="text-4xl">🛡️</div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              You&apos;re protected
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              You&apos;re now covered by Guardurai. If you ever run into a likely
              scam, the person looking out for you will be alerted. You also get
              free real-time protection as you browse.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start using Guardurai
            </Link>
          </>
        )}

        {state === "need-signin" && (
          <>
            <div className="text-4xl">🛡️</div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Someone wants to keep you safe
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in (or create a free account) to accept your Guardurai
              protection invite.
            </p>
            <SignInButton
              mode="modal"
              forceRedirectUrl={here}
              signUpForceRedirectUrl={here}
            >
              <button className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Sign in or create an account to accept
              </button>
            </SignInButton>
          </>
        )}

        {state === "no-code" && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Invite link needed</h1>
            <p className="mt-2 text-sm text-slate-600">
              This page needs a valid invite link from someone on a Guardurai
              Family plan.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Go to Guardurai →
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Couldn&apos;t accept invite
            </h1>
            <p className="mt-2 text-sm text-slate-600">{errorMsg}</p>
            <Link
              href="/"
              className="mt-5 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Go to Guardurai →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
