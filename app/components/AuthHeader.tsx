import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { isClerkConfigured } from "@/app/lib/auth";

/**
 * Optional account bar. Renders nothing until Clerk is configured, so the app
 * works for anonymous visitors out of the box.
 */
export default function AuthHeader() {
  if (!isClerkConfigured()) return null;

  return (
    <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur">
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
