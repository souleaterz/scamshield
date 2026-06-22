"use client";

import { useState } from "react";

interface Member {
  id: string;
  member_label: string;
  member_user_id: string | null;
  invite_code: string;
  invite_url: string;
  status: "pending" | "active" | "revoked";
  created_at: string;
  accepted_at: string | null;
}

interface Alert {
  memberLabel: string;
  scam: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isRecent(dateStr: string | null, mins = 10): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < mins * 60_000;
}

function StatCard({
  value,
  label,
  tone = "slate",
}: {
  value: string | number;
  label: string;
  tone?: "slate" | "emerald" | "amber" | "red";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className={`text-2xl font-bold ${colors[tone]}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

export default function FamilyDashboard({
  initialMembers,
  initialAlertEmail,
  maxMembers,
  alerts,
}: {
  initialMembers: Member[];
  initialAlertEmail: string | null;
  maxMembers: number;
  alerts: Alert[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail] = useState(initialAlertEmail ?? "");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const protectedCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;

  async function saveEmail() {
    setEmailMsg(null);
    const res = await fetch("/api/family/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertEmail: email }),
    });
    const data = await res.json();
    setEmailMsg(res.ok ? "Saved." : data?.error ?? "Couldn't save.");
  }

  async function addMember() {
    if (!label.trim()) return;
    setBusy(true);
    setAddMsg(null);
    const res = await fetch("/api/family/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok && data.member) {
      setMembers((m) => [...m, data.member]);
      setLabel("");
    } else {
      setAddMsg(data?.error ?? "Couldn't add that person.");
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/family/members?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
  }

  async function copyLink(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={protectedCount} label="Protected" tone="emerald" />
        <StatCard value={pendingCount} label="Invites pending" tone="amber" />
        <StatCard value={alerts.length} label="Scam alerts" tone="red" />
        <StatCard value="Family" label="Your plan" />
      </div>

      {/* Recent activity / alerts feed */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Scams Guardurai has flagged for the people you protect.
        </p>
        {alerts.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 text-lg" aria-hidden>
                  ⚠️
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{a.memberLabel}</span>{" "}
                    encountered a likely scam
                  </p>
                  <p className="truncate text-xs text-slate-500">{a.scam}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {timeAgo(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-800">
            ✓ No scam alerts yet — that&apos;s good news. We&apos;ll email you
            the moment anyone you protect runs into a scam.
          </div>
        )}
      </section>

      {/* People you protect */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          People you protect
          <span className="ml-2 text-sm font-normal text-slate-400">
            {members.length}/{maxMembers}
          </span>
        </h2>

        {members.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    m.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {m.member_label.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {m.member_label}
                    </span>
                    {m.status === "active" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        ✓ Protected
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Invite pending
                      </span>
                    )}
                    {isRecent(m.accepted_at) && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Just joined!
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {m.status === "active" && m.accepted_at
                      ? `Joined ${timeAgo(m.accepted_at)} · Pro access included`
                      : "Hasn't accepted yet"}
                  </p>
                  {m.status === "pending" && (
                    <button
                      onClick={() => copyLink(m.invite_url, m.id)}
                      className="mt-1 text-left text-xs font-medium text-blue-600 hover:text-blue-700"
                      title={m.invite_url}
                    >
                      {copied === m.id ? "✓ Link copied!" : "Copy invite link →"}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => revoke(m.id)}
                  className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No one yet. Add a family member below and send them their invite
            link.
          </p>
        )}

        {members.length < maxMembers && (
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name (e.g. Mum)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={addMember}
              disabled={busy || !label.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add person"}
            </button>
          </div>
        )}
        {addMsg && <p className="mt-2 text-xs text-red-600">{addMsg}</p>}
      </section>

      {/* Alert email */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Alert email</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Where we send alerts when someone you protect hits a scam.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={saveEmail}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
        {emailMsg && <p className="mt-2 text-xs text-slate-500">{emailMsg}</p>}
      </section>

      <p className="text-center text-xs text-slate-400">
        Each person you protect also gets Guardurai Pro and free real-time
        protection as they browse.
      </p>
    </div>
  );
}
