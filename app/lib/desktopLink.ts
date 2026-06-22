import { randomBytes } from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { getTierForUser } from "@/app/lib/subscription";
import type { Tier } from "@/app/lib/scamAnalysis";

// Pending pairing codes are only valid for a short window.
const CODE_TTL_MS = 15 * 60 * 1000;

// Human-typed code: 6 chars, no ambiguous 0/O/1/I/L.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function makeToken(): string {
  return randomBytes(32).toString("hex");
}

export interface LinkStart {
  code: string;
  token: string;
}

/** Create a pending pairing row. Returns null if Supabase isn't configured. */
export async function startDeviceLink(): Promise<LinkStart | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const token = makeToken();
  const code = makeCode();

  const { error } = await supabase.from("desktop_links").insert({
    token,
    code,
    status: "pending",
  });
  if (error) {
    console.error("startDeviceLink failed:", error.message);
    return null;
  }
  return { code, token };
}

/**
 * Tie a signed-in user to a pending code (called from the /link page).
 * Returns an error string on failure.
 */
export async function claimDeviceLink(
  code: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "unavailable" };

  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return { ok: false, error: "invalid" };

  const cutoff = new Date(Date.now() - CODE_TTL_MS).toISOString();
  const { data: row } = await supabase
    .from("desktop_links")
    .select("token, created_at")
    .eq("status", "pending")
    .ilike("code", normalized)
    .gte("created_at", cutoff)
    .maybeSingle();

  if (!row) return { ok: false, error: "expired" };

  const { error } = await supabase
    .from("desktop_links")
    .update({ user_id: userId, status: "linked", linked_at: new Date().toISOString() })
    .eq("token", row.token);

  if (error) {
    console.error("claimDeviceLink failed:", error.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

export interface LinkStatus {
  linked: boolean;
  name?: string;
  email?: string;
  tier?: Tier;
}

/** Poll status for a token; once linked, returns the user's name + live tier. */
export async function getDeviceLinkStatus(token: string): Promise<LinkStatus> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { linked: false };

  const { data: row } = await supabase
    .from("desktop_links")
    .select("user_id, status")
    .eq("token", token)
    .maybeSingle();

  if (!row || row.status !== "linked" || !row.user_id) return { linked: false };

  const tier = await getTierForUser(row.user_id);

  let name = "Account";
  let email: string | undefined;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(row.user_id);
    name = user.firstName || user.username || "Account";
    email = user.primaryEmailAddress?.emailAddress;
  } catch {
    /* best-effort display name */
  }

  return { linked: true, name, email, tier };
}

/** Resolve a device token straight to a Clerk user id (used to apply paid tier). */
export async function resolveDeviceToken(token: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("desktop_links")
    .select("user_id, status")
    .eq("token", token)
    .maybeSingle();
  return data?.status === "linked" ? (data.user_id ?? null) : null;
}

/** Unpair a device (delete the row). */
export async function unlinkDevice(token: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("desktop_links").delete().eq("token", token);
}
