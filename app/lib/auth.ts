import { auth } from "@clerk/nextjs/server";

export function isClerkConfigured(): boolean {
  return (
    Boolean(process.env.CLERK_SECRET_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  );
}

/**
 * Returns the signed-in Clerk user ID, or null for anonymous visitors (and
 * when Clerk isn't configured). Only calls auth() when Clerk middleware is
 * active, so it's safe to use before any accounts are set up.
 */
export async function getUserId(): Promise<string | null> {
  if (!isClerkConfigured()) return null;
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Like getUserId, but also recognises the Guardurai desktop app, which can't
 * carry a Clerk cookie. The app sends its paired device token as the
 * `x-guardurai-device` header; we resolve that to the linked Clerk user so
 * checks run at the user's paid tier. Falls back to the normal cookie session.
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const token = request.headers.get("x-guardurai-device");
  if (token) {
    // Lazy import avoids pulling Supabase into the anonymous/cookie path.
    const { resolveDeviceToken } = await import("@/app/lib/desktopLink");
    const userId = await resolveDeviceToken(token);
    if (userId) return userId;
  }
  return getUserId();
}

/** First IP from x-forwarded-for, falling back to x-real-ip. */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
