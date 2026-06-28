"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useHistoryItem } from "@/hooks/useHistory";
import { DIRECT_API_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PrivacyBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    public: "bg-emerald-900/40 text-emerald-400 border border-emerald-700/40",
    private: "bg-zinc-700/60 text-zinc-300 border border-zinc-600/40",
    unlisted: "bg-amber-900/40 text-amber-400 border border-amber-700/40",
  };
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
        styles[status] ?? "bg-zinc-700 text-zinc-300"
      )}
    >
      {status}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="w-full h-44 bg-zinc-800 rounded-xl" />
      <div className="h-6 bg-zinc-800 rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-5 bg-zinc-800 rounded w-16" />
        <div className="h-5 bg-zinc-800 rounded w-24" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800 rounded w-5/6" />
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: item, isLoading, error } = useHistoryItem(params.id);

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to History
      </Link>

      {isLoading && <DetailSkeleton />}

      {error && (
        <div className="text-center py-16">
          <p className="text-zinc-400 font-medium">Video not found.</p>
          <p className="text-zinc-600 text-sm mt-1">
            This history entry may have been deleted.
          </p>
          <Link
            href="/history"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to History
          </Link>
        </div>
      )}

      {item && (
        <>
          {/* Thumbnail */}
          {item.thumbnail_url && (
            <img
              src={`${DIRECT_API_URL}${item.thumbnail_url}`}
              alt={item.video_title}
              className="w-full rounded-xl mb-6 object-cover max-h-48"
            />
          )}

          {/* Title + meta */}
          <h1 className="text-xl font-bold text-white mb-3">
            {item.video_title}
          </h1>
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <PrivacyBadge status={item.privacy_status} />
            <span className="text-xs text-zinc-500">
              {formatDate(item.published_at)}
            </span>
            <a
              href={item.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              Watch on YouTube <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Description */}
          <Section title="Description">
            {item.description ? (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>
            ) : (
              <p className="text-sm text-zinc-600">—</p>
            )}
          </Section>

          {/* Tags */}
          <Section title="Tags">
            {item.tags && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No tags.</p>
            )}
          </Section>

          {/* YouTube Video ID */}
          <Section title="YouTube Video ID">
            <code className="text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded font-mono">
              {item.youtube_video_id}
            </code>
          </Section>

          {/* Status */}
          <Section title="Publish Status">
            <span className="text-sm text-zinc-300 capitalize">{item.status}</span>
          </Section>

          {/* Project ID (upload reference) */}
          {item.project_id && (
            <Section title="Upload ID">
              <code className="text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded font-mono">
                {item.project_id}
              </code>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
