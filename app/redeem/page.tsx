import { SignInButton } from "@clerk/nextjs";
import { getUserId, isClerkConfigured } from "@/app/lib/auth";
import RedeemForm from "./RedeemForm";

export const metadata = { title: "Redeem a code — Guardurai" };

export default async function RedeemPage() {
  const userId = await getUserId();

  const perks = [
    { icon: "🛡️", text: "Real-time protection from scam & phishing sites" },
    { icon: "🤖", text: "Unlimited AI checks on texts, links, emails & numbers" },
    { icon: "👨‍👩‍👧", text: "Guardian alerts to protect your family (Family plan)" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Gift header band */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-7 py-8 text-center text-white">
          <div className="text-5xl">🎁</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            Redeem your code
          </h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-blue-100">
            Unlock a month of Guardurai — no card, no auto-charge.
          </p>
        </div>

        <div className="p-7">
          {userId ? (
            <RedeemForm />
          ) : (
            <div className="text-center">
              <ul className="mb-6 space-y-2.5 text-left">
                {perks.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="text-base leading-5">{p.icon}</span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-600">
                Sign in or create a free account to redeem your code.
              </p>
              {isClerkConfigured() ? (
                <SignInButton
                  mode="modal"
                  forceRedirectUrl="/redeem"
                  signUpForceRedirectUrl="/redeem"
                >
                  <button className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                    Sign in to redeem
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
      </div>
    </main>
  );
}
