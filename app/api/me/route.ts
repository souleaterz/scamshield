import { NextResponse, after } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getUserId } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import { recordExtensionActivity } from "@/app/lib/family";

export const runtime = "nodejs";

// Identity probe for the extension popup. The extension sends the Guardurai
// session cookie (credentials: "include"), so this tells it who the user is,
// what plan they're on, and lets the popup nudge free users to upgrade.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ signedIn: false });

  // A signed-in user opening the popup = an active extension user. Record a
  // heartbeat (non-blocking) so we can nurture them and show family status.
  after(() => void recordExtensionActivity(userId));

  let firstName: string | null = null;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    firstName = user.firstName || user.username || null;
  } catch {
    /* name is best-effort */
  }

  const tier = await getTierForUser(userId);
  return NextResponse.json({ signedIn: true, tier, firstName });
}
