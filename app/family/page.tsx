import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/app/lib/auth";
import { getTierForUser } from "@/app/lib/subscription";
import {
  listMembers,
  getAlertEmail,
  getGuardianAlerts,
  getExtensionLastSeen,
  inviteUrl,
  MAX_MEMBERS,
} from "@/app/lib/family";
import FamilyDashboard from "./FamilyDashboard";

export const metadata = { title: "Family protection — Guardurai" };

export default async function FamilyPage() {
  const userId = await getUserId();
  if (!userId) redirect("/");

  const tier = await getTierForUser(userId);

  if (tier !== "family") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back
        </Link>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Protect the people you love
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The <strong>Family plan</strong> lets you protect up to {MAX_MEMBERS}{" "}
            people — and emails you the moment one of them runs into a likely
            scam, so you can step in before any harm is done.
          </p>
          <Link
            href="/?plan=family#pricing"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            See the Family plan — £9.99/mo
          </Link>
        </div>
      </main>
    );
  }

  const [members, alertEmail, alerts] = await Promise.all([
    listMembers(userId),
    getAlertEmail(userId),
    getGuardianAlerts(userId),
  ]);

  const memberUserIds = members
    .map((m) => m.member_user_id)
    .filter((id): id is string => Boolean(id));
  const lastSeen = await getExtensionLastSeen(memberUserIds);
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  const initialMembers = members.map((m) => {
    const seen = m.member_user_id ? lastSeen.get(m.member_user_id) : undefined;
    return {
      ...m,
      invite_url: inviteUrl(m.invite_code),
      extensionActive: seen ? Date.now() - new Date(seen).getTime() < WEEK : false,
    };
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Family protection</h1>
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New check
        </Link>
      </div>

      <FamilyDashboard
        initialMembers={initialMembers}
        initialAlertEmail={alertEmail}
        maxMembers={MAX_MEMBERS}
        alerts={alerts}
      />
    </main>
  );
}
