"use client";

import { useState } from "react";

interface Member {
  id: string;
  member_label: string;
  member_user_id: string | null;
  invite_code: string;
  invite_url: string;
  status: "pending" | "active" | "revoked";
}

export default function FamilyDashboard({
  initialMembers,
  initialAlertEmail,
  maxMembers,
}: {
  initialMembers: Member[];
  initialAlertEmail: string | null;
  maxMembers: number;
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail] = useState(initialAlertEmail ?? "");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
      {/* Alert email */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Where should alerts go?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          We&apos;ll email this address when someone you protect runs into a
          likely scam.
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

      {/* Members */}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {m.member_label}
                    </span>
                    {m.status === "active" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Protected
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Invite pending
                      </span>
                    )}
                  </div>
                  {m.status === "pending" && (
                    <button
                      onClick={() => copyLink(m.invite_url, m.id)}
                      className="mt-1 truncate text-left text-xs text-blue-600 hover:text-blue-700"
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

      <p className="text-center text-xs text-slate-400">
        Send each person their invite link. When they open it and sign in,
        they&apos;re protected — and they get Guardurai&apos;s free real-time
        protection too.
      </p>
    </div>
  );
}
