"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlayCircle, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useYouTubeCredentials,
  useYouTubeAccount,
  useSaveCredentials,
  useUpdateCredentials,
  useDisconnect,
  useConnectYouTube,
} from "@/hooks/useYouTube";
import YouTubeChannelPicker from "@/components/YouTubeChannelPicker";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  client_id: z.string().min(10, "Client ID is required").max(500),
  client_secret: z.string().min(10, "Client Secret is required").max(500),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  );
}

function SetupGuide() {
  const steps = [
    { label: "Create a Google Cloud Project", href: "https://console.cloud.google.com/projectcreate" },
    { label: "Enable YouTube Data API v3", href: "https://console.cloud.google.com/apis/library/youtube.googleapis.com" },
    { label: 'Create OAuth 2.0 Client ID (type: "Web application")', href: null },
    {
      label: (
        <>
          Add redirect URI:{" "}
          <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono">
            http://localhost:8000/api/v1/youtube/callback
          </code>
        </>
      ),
      href: null,
    },
    { label: "Paste Client ID and Client Secret below", href: null },
  ];

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-4 mb-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Setup Guide · ~3 minutes
      </p>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="leading-snug">
              {step.label}
              {step.href && (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1.5 inline-flex items-center gap-0.5 text-red-400 hover:text-red-300 transition-colors"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: credentials, isLoading: credsLoading } = useYouTubeCredentials();
  const { data: account, isLoading: accountLoading } = useYouTubeAccount();

  const saveCredentials = useSaveCredentials();
  const updateCredentials = useUpdateCredentials();
  const disconnect = useDisconnect();
  const connectYouTube = useConnectYouTube();

  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [youtubeSession, setYoutubeSession] = useState<string | null>(null);

  // Detect OAuth callback result via URL params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const session = searchParams.get("youtube_session");
    if (connected === "true") setConnectSuccess(true);
    if (session) setYoutubeSession(session);
    if (error) {
      const msg =
        error === "access_denied"
          ? "Google access was denied. Please try again."
          : "Failed to connect YouTube. Please try again.";
      setConnectError(msg);
    }
    if (connected || session || error) router.replace("/settings");
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
  });

  const hasCredentials = !!credentials;
  const hasAccount = !!account;

  async function onSubmitCredentials(values: CredentialsFormValues) {
    setConnectError(null);
    if (hasCredentials && !showEditForm) return;
    const mutation = hasCredentials && showEditForm ? updateCredentials : saveCredentials;
    try {
      await mutation.mutateAsync(values);
      reset();
      setShowEditForm(false);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to save credentials.");
    }
  }

  async function handleConnect() {
    setConnectError(null);
    setConnectingOAuth(true);
    try {
      await connectYouTube();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to start OAuth flow.");
      setConnectingOAuth(false);
    }
  }

  async function handleDisconnect() {
    setConnectError(null);
    setConnectSuccess(false);
    try {
      await disconnect.mutateAsync();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to disconnect.");
    }
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const connectedAt = account?.connected_at
    ? new Date(account.connected_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

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

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-5 uppercase tracking-wider">
          YouTube API Credentials
        </h2>

        {/* Setup guide — shown until credentials are saved */}
        {!hasCredentials && <SetupGuide />}

        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Creating Google OAuth credentials is free and usually takes less than 3 minutes.
          TubeFlow uses your own YouTube API quota so you are not affected by platform-wide
          upload limits.
        </p>

        {/* Credentials display (saved state) */}
        {hasCredentials && !showEditForm && (
          <div className="mb-4 p-3 bg-zinc-800/50 border border-zinc-700/60 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Client ID
              </span>
              <button
                onClick={() => setShowEditForm(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Update credentials
              </button>
            </div>
            <p className="text-sm text-white font-mono truncate">{credentials.client_id}</p>
            <div className="mt-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Client Secret
              </span>
              <p className="text-sm text-zinc-400 font-mono">{credentials.client_secret_masked}</p>
            </div>
          </div>
        )}

        {/* Credentials form (new or edit) */}
        {(!hasCredentials || showEditForm) && (
          <form onSubmit={handleSubmit(onSubmitCredentials)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Client ID
              </label>
              <input
                {...register("client_id")}
                type="text"
                placeholder="123456789-abc...apps.googleusercontent.com"
                autoComplete="off"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors font-mono"
              />
              {errors.client_id && (
                <p className="text-xs text-red-400">{errors.client_id.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Client Secret
              </label>
              <input
                {...register("client_secret")}
                type="password"
                placeholder="GOCSPX-..."
                autoComplete="new-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              {errors.client_secret && (
                <p className="text-xs text-red-400">{errors.client_secret.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {hasCredentials ? "Update Credentials" : "Save Credentials"}
              </button>
              {showEditForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    reset();
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-5 uppercase tracking-wider">
          YouTube Channel
        </h2>

        {/* Global feedback banners */}
        {connectSuccess && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-emerald-900/30 border border-emerald-700/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300">YouTube channel connected successfully.</p>
          </div>
        )}
        {connectError && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-red-900/30 border border-red-700/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{connectError}</p>
          </div>
        )}

        {credsLoading || accountLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            <span className="text-sm text-zinc-500">Loading…</span>
          </div>
        ) : hasAccount ? (
          /* State C — connected */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{account.channel_name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {account.channel_handle ? `${account.channel_handle} · ` : ""}
                  Connected {connectedAt}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-600/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {disconnect.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Disconnect
            </button>
          </div>
        ) : hasCredentials ? (
          /* State B — credentials saved, not connected */
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-400">
              Your credentials are saved. Connect your YouTube channel to continue.
            </p>
            <button
              onClick={handleConnect}
              disabled={connectingOAuth}
              className="flex items-center gap-2 self-start bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {connectingOAuth ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlayCircle className="w-3.5 h-3.5" />
              )}
              Connect YouTube
            </button>
          </div>
        ) : (
          /* State A — no credentials */
          <div className="flex items-start gap-3 py-3 px-4 border border-zinc-800 rounded-lg bg-zinc-800/30">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-300">No YouTube channel connected</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Add your Client ID and Client Secret above first.
              </p>
            </div>
          </div>
        )}
      </section>

      <button
        onClick={logout}
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-4 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
      >
        Sign out
      </button>

      {/* Channel picker modal — shown after OAuth when multiple channels found */}
      {youtubeSession && (
        <YouTubeChannelPicker
          sessionId={youtubeSession}
          onSuccess={() => {
            setYoutubeSession(null);
            setConnectSuccess(true);
          }}
          onClose={() => setYoutubeSession(null)}
        />
      )}
    </div>
  );
}
