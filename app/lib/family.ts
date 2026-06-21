import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/app/lib/supabase";
import { sendEmail } from "@/app/lib/email";
import { SITE_URL } from "@/app/lib/site";

export const MAX_MEMBERS = 5;

export interface FamilyMember {
  id: string;
  member_label: string;
  member_user_id: string | null;
  invite_code: string;
  status: "pending" | "active" | "revoked";
  created_at: string;
}

function code(): string {
  return randomBytes(9).toString("base64url"); // ~12 url-safe chars
}

// ── Guardian-side reads/writes ───────────────────────────────────────────────

export async function listMembers(guardianUserId: string): Promise<FamilyMember[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("family_members")
    .select("id, member_label, member_user_id, invite_code, status, created_at")
    .eq("guardian_user_id", guardianUserId)
    .neq("status", "revoked")
    .order("created_at", { ascending: true });
  return (data ?? []) as FamilyMember[];
}

export async function addMember(
  guardianUserId: string,
  label: string,
): Promise<FamilyMember | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const existing = await listMembers(guardianUserId);
  if (existing.length >= MAX_MEMBERS) return null;

  const { data, error } = await supabase
    .from("family_members")
    .insert({
      guardian_user_id: guardianUserId,
      member_label: label.slice(0, 40),
      invite_code: code(),
      status: "pending",
    })
    .select("id, member_label, member_user_id, invite_code, status, created_at")
    .single();

  if (error) {
    console.error("[family] addMember failed:", error.message);
    return null;
  }
  return data as FamilyMember;
}

export async function revokeMember(
  guardianUserId: string,
  memberRowId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error } = await supabase
    .from("family_members")
    .update({ status: "revoked" })
    .eq("id", memberRowId)
    .eq("guardian_user_id", guardianUserId);
  return !error;
}

export function inviteUrl(inviteCode: string): string {
  return `${SITE_URL}/family/join?code=${encodeURIComponent(inviteCode)}`;
}

// ── Alert settings ───────────────────────────────────────────────────────────

export async function getAlertEmail(guardianUserId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("family_settings")
    .select("alert_email")
    .eq("guardian_user_id", guardianUserId)
    .maybeSingle();
  return (data?.alert_email as string | null) ?? null;
}

export async function setAlertEmail(
  guardianUserId: string,
  email: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error } = await supabase.from("family_settings").upsert({
    guardian_user_id: guardianUserId,
    alert_email: email,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

// ── Member-side: accept an invite ────────────────────────────────────────────

export async function acceptInvite(
  inviteCode: string,
  memberUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "unavailable" };

  const { data: row } = await supabase
    .from("family_members")
    .select("id, guardian_user_id, status")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (!row) return { ok: false, error: "invalid" };
  if (row.guardian_user_id === memberUserId)
    return { ok: false, error: "self" };
  if (row.status === "revoked") return { ok: false, error: "revoked" };

  const { error } = await supabase
    .from("family_members")
    .update({
      member_user_id: memberUserId,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}

// ── Alert dispatch (called when a protected member hits a likely scam) ───────

interface GuardianTarget {
  guardianUserId: string;
  alertEmail: string;
  memberLabel: string;
}

async function getGuardianForMember(
  memberUserId: string,
): Promise<GuardianTarget | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: link } = await supabase
    .from("family_members")
    .select("guardian_user_id, member_label")
    .eq("member_user_id", memberUserId)
    .eq("status", "active")
    .maybeSingle();
  if (!link) return null;

  const { data: settings } = await supabase
    .from("family_settings")
    .select("alert_email")
    .eq("guardian_user_id", link.guardian_user_id)
    .maybeSingle();
  if (!settings?.alert_email) return null;

  return {
    guardianUserId: link.guardian_user_id,
    alertEmail: settings.alert_email as string,
    memberLabel: link.member_label as string,
  };
}

/** Insert into the dedup ledger. Returns true if this alert is new (send it). */
async function shouldAlert(memberUserId: string, dedupKey: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("guardian_alerts")
    .insert({ member_user_id: memberUserId, dedup_key: `${today}:${dedupKey}` });
  // Unique-violation → already alerted today → don't resend.
  return !error;
}

/**
 * If this user is a protected family member, email their guardian about a
 * likely-scam verdict. Fire-and-forget; safe to call for every check.
 */
export async function notifyGuardianOfScam(
  memberUserId: string,
  opts: { summary: string; detectedType: string; dedupKey: string },
): Promise<void> {
  const target = await getGuardianForMember(memberUserId);
  if (!target) return;

  if (!(await shouldAlert(memberUserId, opts.dedupKey))) return;

  const summary = opts.summary || "A check came back as a likely scam.";
  await sendEmail({
    to: target.alertEmail,
    subject: `⚠️ Guardurai alert: ${target.memberLabel} may have hit a scam`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">⚠️ Possible scam detected</h2>
        <p style="color:#334155;font-size:15px">
          <strong>${escapeHtml(target.memberLabel)}</strong> just encountered
          something Guardurai flagged as a
          <strong style="color:#ef4444">likely scam</strong>.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin:14px 0">
          <p style="margin:0;color:#7f1d1d;font-size:14px">
            <strong>${escapeHtml(opts.detectedType)}:</strong> ${escapeHtml(summary)}
          </p>
        </div>
        <p style="color:#334155;font-size:15px">
          You may want to check in with them before they take any action, send
          money, or share personal details.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          You're receiving this because you protect ${escapeHtml(target.memberLabel)}
          on a Guardurai Family plan.
        </p>
      </div>`,
  });
}

function escapeHtml(s: string): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}
