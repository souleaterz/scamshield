import { SignInButton } from "@clerk/nextjs";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import LinkForm from "./LinkForm";

export const metadata = { title: "Link your desktop app — Guardurai" };

export default async function LinkPage() {
  const userId = await getUserId();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {userId ? (
          <LinkForm />
        ) : (
          <div className="text-center">
            <div className="text-4xl">🔗</div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Link your desktop app
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to connect the Guardurai desktop app to your account and
              unlock your plan&apos;s features.
            </p>
            {isClerkConfigured() ? (
              <SignInButton
                mode="modal"
                forceRedirectUrl="/link"
                signUpForceRedirectUrl="/link"
              >
                <button className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Sign in to continue
                </button>
              </SignInButton>
            ) : (
              <p className="mt-4 text-sm text-red-600">
                Sign-in is temporarily unavailable.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
