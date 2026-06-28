"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, PlayCircle, Search, Trash2 } from "lucide-react";
import { useHistory, useDeleteHistoryItem } from "@/hooks/useHistory";
import { DIRECT_API_URL } from "@/lib/constants";
import type { HistoryItem } from "@/types/history";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
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
    public:
      "bg-emerald-900/40 text-emerald-400 border border-emerald-700/40",
    private: "bg-zinc-700/60 text-zinc-300 border border-zinc-600/40",
    unlisted:
      "bg-amber-900/40 text-amber-400 border border-amber-700/40",
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

function HistoryCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4 animate-pulse">
      <div className="w-24 h-14 rounded-lg bg-zinc-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800 rounded w-1/3" />
        <div className="h-3 bg-zinc-800 rounded w-1/4" />
      </div>
    </div>
  );
}

const FILTERS = [
  { label: "All", value: "" },
  { label: "Videos", value: "video" },
  { label: "Shorts", value: "short" },
  { label: "Published", value: "published" },
  { label: "Failed", value: "failed" },
  { label: "Private", value: "private" },
  { label: "Public", value: "public" },
];

function ContentTypeBadge({ type }: { type: string }) {
  if (type === "short") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-700/40">
        SHORT
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300 border border-zinc-600/40">
      VIDEO
    </span>
  );
}

// ---------------------------------------------------------------------------
// History Card
// ---------------------------------------------------------------------------

function HistoryCard({
  item,
  isDeleting,
  onDelete,
}: {
  item: HistoryItem;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`View details for ${item.video_title}`}
      onClick={() => router.push(`/history/${item.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/history/${item.id}`)}
      className="block group cursor-pointer"
    >
      <div className="bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 rounded-xl p-4 flex gap-4 transition-colors">
        {/* Thumbnail */}
        <div className="w-24 h-14 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
          {item.thumbnail_url ? (
            <img
              src={`${DIRECT_API_URL}${item.thumbnail_url}`}
              alt={item.video_title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {item.video_title}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatDate(item.published_at)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ContentTypeBadge type={item.content_type ?? "video"} />
            <PrivacyBadge status={item.privacy_status} />
            <a
              href={item.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-0.5 transition-colors"
            >
              Watch <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          disabled={isDeleting}
          className="self-start p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          title="Remove from history"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-zinc-400 font-medium">No results found.</p>
        <p className="text-zinc-600 text-sm mt-1">
          Try a different search or filter.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <PlayCircle className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-zinc-300 font-medium">No videos published yet.</p>
      <p className="text-zinc-600 text-sm mt-1">
        Publish your first video to see it here.
      </p>
      <Link
        href="/upload"
        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Upload Your First Video
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  total,
  pageSize,
  hasNext,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  pageSize: number;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  return (
    <div className="flex items-center justify-between mt-6">
      <button
        disabled={page <= 1}
        onClick={onPrev}
        className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-xs text-zinc-500">
        Page {page} of {totalPages} &middot; {total} total
      </span>
      <button
        disabled={!hasNext}
        onClick={onNext}
        className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteItem = useDeleteHistoryItem();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useHistory({
    page,
    page_size: 20,
    filter: activeFilter || undefined,
    search: debouncedSearch || undefined,
  });

  function handleFilterChange(value: string) {
    setActiveFilter(value);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteItem.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  const isFiltered = !!(activeFilter || debouncedSearch);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-sm text-zinc-500 mt-1">
          All videos published through TubeFlow.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title or video ID…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => handleFilterChange(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeFilter === f.value
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <HistoryCardSkeleton />
          <HistoryCardSkeleton />
          <HistoryCardSkeleton />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                isDeleting={deletingId === item.id}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {data.total > 20 && (
            <Pagination
              page={page}
              total={data.total}
              pageSize={data.page_size}
              hasNext={data.has_next}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      )}
    </div>
  );
}
