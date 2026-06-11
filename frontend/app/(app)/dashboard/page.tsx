"use client";

import Link from "next/link";
import { Upload, Settings, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();

  const firstName = user?.full_name.split(" ")[0] ?? "there";

  return (
    <div>
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {firstName}
        </h1>
        <p className="text-zinc-400 text-sm">
          What would you like to do today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <Link
          href="/upload"
          className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl p-6 transition-all hover:bg-zinc-900/80"
        >
          <div className="w-10 h-10 rounded-lg bg-red-600/10 group-hover:bg-red-600/20 flex items-center justify-center mb-4 transition-colors">
            <Upload className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="font-semibold text-white mb-1 text-sm">Upload Video</h2>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Upload a video and generate professional YouTube metadata with AI.
          </p>
        </Link>

        <Link
          href="/settings"
          className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-6 transition-all hover:bg-zinc-900/80"
        >
          <div className="w-10 h-10 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center mb-4 transition-colors">
            <Settings className="w-5 h-5 text-zinc-300" />
          </div>
          <h2 className="font-semibold text-white mb-1 text-sm">Settings</h2>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Manage your account and connect your YouTube channel.
          </p>
        </Link>
      </div>

      {/* Hint */}
      <div className="mt-10 flex items-start gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 max-w-xl">
        <Wand2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <p className="text-zinc-400 text-sm leading-relaxed">
          <span className="text-white font-medium">Get started:</span> Upload a video to generate
          your first metadata package. It takes under 60 seconds.
        </p>
      </div>
    </div>
  );
}
