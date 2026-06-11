"use client";

import { PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Account */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-5 uppercase tracking-wider">
          Account
        </h2>
        <div className="flex flex-col gap-5">
          <Field label="Full Name" value={user?.full_name ?? "—"} />
          <Field label="Email" value={user?.email ?? "—"} />
          <Field label="Member Since" value={createdAt} />
        </div>
      </section>

      {/* YouTube Connections */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-5 uppercase tracking-wider">
          YouTube Connections
        </h2>
        <div className="flex items-center gap-3 py-4 border border-zinc-800 rounded-lg px-4 bg-zinc-800/30">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-300">No YouTube account connected</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              YouTube publishing will be available in a future update.
            </p>
          </div>
        </div>
      </section>

      {/* Sign Out */}
      <button
        onClick={logout}
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
      >
        Sign out
      </button>
    </div>
  );
}
