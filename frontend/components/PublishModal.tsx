"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, CheckCircle2, XCircle, X, AlertTriangle, ImageOff, RefreshCw, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { usePublishToYouTube, useYouTubePlaylists, useSyncPlaylists } from "@/hooks/useYouTube";
import type { YouTubePublishResponse, YouTubeUploadSettings } from "@/types/youtube";
import { DEFAULT_UPLOAD_SETTINGS } from "@/types/youtube";
import { UploadSettingsPanel } from "@/components/UploadSettingsPanel";
import type { WorkflowConfig } from "@/types/workflow";

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //

type PrivacyStatus = "private" | "unlisted" | "public";
type PublishState = "idle" | "publishing" | "success" | "error";

const STAGE_SEQUENCE = [
  "Uploading Video…",
  "Processing…",
  "Applying Metadata…",
  "Uploading Thumbnail…",
  "Finalizing…",
] as const;

const STAGE_INTERVAL_MS = 3_000;

// ------------------------------------------------------------------ //
// Props
// ------------------------------------------------------------------ //

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  initialTitle: string;
  initialDescription: string;
  initialTags: string[];
  thumbnailFile: File | null;
  contentType?: string;
  workflowConfig?: WorkflowConfig | null;
}

// ------------------------------------------------------------------ //
// Component
// ------------------------------------------------------------------ //

export function PublishModal({
  isOpen,
  onClose,
  videoId,
  initialTitle,
  initialDescription,
  initialTags,
  thumbnailFile,
  contentType = "video",
  workflowConfig = null,
}: PublishModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>("private");
  const [uploadSettings, setUploadSettings] = useState<YouTubeUploadSettings>(DEFAULT_UPLOAD_SETTINGS);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [successData, setSuccessData] = useState<YouTubePublishResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { mutate: publish, isPending } = usePublishToYouTube();
  const { data: playlistData, isLoading: isLoadingPlaylists } = useYouTubePlaylists();
  const { mutate: syncPlaylists, isPending: isSyncing } = useSyncPlaylists();

  const playlists = playlistData?.playlists ?? [];

  const filteredPlaylists = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, playlistSearch]);

  // Sync editable fields when props change (e.g. user edits metadata then re-opens modal)
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setTags(initialTags);
      setPublishState("idle");
      setStageIndex(0);
      setSuccessData(null);
      setErrorMessage(null);
      setPlaylistSearch("");

      if (workflowConfig) {
        setPrivacyStatus(workflowConfig.privacy);
        setSelectedPlaylistId(workflowConfig.playlist_id ?? null);
        setUploadSettings({
          ...DEFAULT_UPLOAD_SETTINGS,
          audience: workflowConfig.made_for_kids ? "made_for_kids" : "not_made_for_kids",
          ai_disclosure: workflowConfig.ai_disclosure,
          category_id: workflowConfig.category_id ?? null,
          notify_subscribers: workflowConfig.notify_subscribers,
          allow_embedding: workflowConfig.allow_embedding,
          allow_remixing: workflowConfig.allow_remixing,
          license: workflowConfig.license,
          automatic_chapters: workflowConfig.automatic_chapters,
          automatic_places: workflowConfig.automatic_places,
          automatic_concepts: workflowConfig.automatic_concepts,
        });
      } else {
        setPrivacyStatus("private");
        setUploadSettings(DEFAULT_UPLOAD_SETTINGS);
        setSelectedPlaylistId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Manage thumbnail object URL lifecycle
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  // Clear all stage timers
  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  const startStageProgression = () => {
    clearTimers();
    setStageIndex(0);
    // Advance through stages every STAGE_INTERVAL_MS, stopping at the last one
    STAGE_SEQUENCE.forEach((_, idx) => {
      if (idx === 0) return; // first stage shown immediately
      const timer = setTimeout(() => {
        setStageIndex((prev) => Math.min(prev + 1, STAGE_SEQUENCE.length - 1));
      }, idx * STAGE_INTERVAL_MS);
      timerRefs.current.push(timer);
    });
  };

  const handlePublish = () => {
    setPublishState("publishing");
    startStageProgression();

    publish(
      {
        video_id: videoId,
        title,
        description,
        tags,
        privacy_status: privacyStatus,
        content_type: contentType,
        playlist_id: selectedPlaylistId ?? null,
        upload_settings: uploadSettings,
      },
      {
        onSuccess: (data) => {
          clearTimers();
          setSuccessData(data);
          setPublishState("success");
        },
        onError: (err) => {
          clearTimers();
          setErrorMessage(err.message ?? "An unexpected error occurred. Please try again.");
          setPublishState("error");
        },
      }
    );
  };

  const handleReset = () => {
    clearTimers();
    setPublishState("idle");
    setStageIndex(0);
    setSuccessData(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (publishState === "publishing") return; // prevent close during upload
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const isPublishing = publishState === "publishing" || isPending;
  const currentStageLabel = STAGE_SEQUENCE[stageIndex];

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2
            id="publish-modal-title"
            className="text-base font-semibold text-foreground"
          >
            {publishState === "success"
              ? "Video Published Successfully"
              : publishState === "error"
              ? "Publish Failed"
              : "Publish To YouTube"}
          </h2>
          {publishState !== "publishing" && (
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">

          {/* ── IDLE STATE: form ── */}
          {publishState === "idle" && (
            <div className="space-y-5">
              {/* Publishing as badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Publishing as</span>
                {contentType === "short" ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 tracking-wide">
                    SHORT
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300 border border-zinc-600/40 tracking-wide">
                    VIDEO
                  </span>
                )}
                <span className="text-xs text-muted-foreground/60">— determined automatically</span>
              </div>

              {/* Thumbnail preview */}
              <div className="space-y-1.5">
                <Label>Thumbnail</Label>
                {thumbnailPreviewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-800 aspect-video max-h-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailPreviewUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2.5">
                    <ImageOff className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                    <p className="text-xs text-amber-300">No thumbnail — YouTube will use a video frame instead.</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="publish-title">Title</Label>
                <Input
                  id="publish-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Video title"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {title.length} / 100
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="publish-description">Description</Label>
                <Textarea
                  id="publish-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  className="resize-y min-h-[100px]"
                  placeholder="Video description"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length} / 5000
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  maxTags={30}
                  placeholder="Add a tag and press Enter…"
                />
                <p className="text-xs text-muted-foreground">
                  {tags.length} / 30 tags
                </p>
              </div>

              {/* Privacy */}
              <div className="space-y-1.5">
                <Label htmlFor="publish-privacy">Privacy</Label>
                <select
                  id="publish-privacy"
                  value={privacyStatus}
                  onChange={(e) => setPrivacyStatus(e.target.value as PrivacyStatus)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {privacyStatus === "private" && "Only you can see this video."}
                  {privacyStatus === "unlisted" && "Anyone with the link can see this video."}
                  {privacyStatus === "public" && "Everyone can see this video."}
                </p>
              </div>

              {/* Playlist */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <ListVideo className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    YouTube Playlist
                    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => syncPlaylists()}
                    disabled={isSyncing}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    aria-label="Refresh playlists from YouTube"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
                      aria-hidden="true"
                    />
                    {isSyncing ? "Syncing…" : "Refresh"}
                  </button>
                </div>

                {isLoadingPlaylists ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-700/60 bg-zinc-800/40">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">Loading playlists…</span>
                  </div>
                ) : playlists.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-700/40 bg-zinc-800/30 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      No playlists found.{" "}
                      <button
                        type="button"
                        onClick={() => syncPlaylists()}
                        disabled={isSyncing}
                        className="underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        Sync from YouTube
                      </button>{" "}
                      to load your playlists.
                    </p>
                  </div>
                ) : (
                  <>
                    {playlists.length > 5 && (
                      <Input
                        placeholder="Search playlists…"
                        value={playlistSearch}
                        onChange={(e) => setPlaylistSearch(e.target.value)}
                        className="h-8 text-sm"
                        aria-label="Search playlists"
                      />
                    )}
                    <select
                      id="publish-playlist"
                      value={selectedPlaylistId ?? ""}
                      onChange={(e) => setSelectedPlaylistId(e.target.value || null)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Select a playlist"
                    >
                      <option value="">No Playlist</option>
                      {filteredPlaylists.map((p) => (
                        <option key={p.youtube_playlist_id} value={p.youtube_playlist_id}>
                          {p.title} ({p.item_count} {p.item_count === 1 ? "video" : "videos"})
                        </option>
                      ))}
                    </select>
                    {filteredPlaylists.length === 0 && playlistSearch && (
                      <p className="text-xs text-muted-foreground">
                        No playlists match &ldquo;{playlistSearch}&rdquo;.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Upload Settings */}
              <UploadSettingsPanel
                value={uploadSettings}
                onChange={setUploadSettings}
              />
            </div>
          )}

          {/* ── PUBLISHING STATE: progress ── */}
          {publishState === "publishing" && (
            <div
              className="flex flex-col items-center justify-center py-10 space-y-5"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader2
                className="w-10 h-10 text-primary animate-spin"
                aria-hidden="true"
              />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {currentStageLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  Do not close this window.
                </p>
              </div>
              {/* Stage dots */}
              <div className="flex gap-1.5" aria-hidden="true">
                {STAGE_SEQUENCE.map((label, idx) => (
                  <span
                    key={label}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      idx <= stageIndex ? "bg-primary" : "bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── SUCCESS STATE ── */}
          {publishState === "success" && successData && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <CheckCircle2
                className="w-12 h-12 text-emerald-400"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Published to{" "}
                  <span className="text-primary">{successData.channel_name}</span>
                </p>
                <p className="text-xs text-muted-foreground break-all">
                  {successData.video_url}
                </p>
              </div>

              {/* Thumbnail upload status */}
              {successData.thumbnail_uploaded ? (
                <div className="flex items-center gap-2 w-full rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                  <p className="text-xs text-emerald-300 text-left">Thumbnail uploaded successfully.</p>
                </div>
              ) : (
                <div className="flex items-start gap-2 w-full rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-left space-y-1">
                    <p className="text-xs text-amber-300 font-medium">Thumbnail not uploaded to YouTube.</p>
                    {successData.thumbnail_error && (
                      <p className="text-xs text-amber-400/80">
                        {successData.thumbnail_error.includes("forbidden") ||
                        successData.thumbnail_error.includes("403") ||
                        successData.thumbnail_error.includes("unverified")
                          ? "Your YouTube channel must be verified (phone-verified) before custom thumbnails can be set via the API. Verify your channel at YouTube Studio, then re-publish."
                          : successData.thumbnail_error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Playlist insertion status */}
              {successData.playlist_error && (
                <div className="flex items-start gap-2 w-full rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-amber-300 text-left">
                    Video uploaded successfully but could not be added to the playlist.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                <a
                  href={successData.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button type="button" className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    View On YouTube
                  </Button>
                </a>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {publishState === "error" && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <XCircle
                className="w-12 h-12 text-destructive"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Publish failed
                </p>
                {errorMessage && (
                  <p
                    className="text-xs text-muted-foreground max-w-sm"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleReset}
                >
                  Try Again
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — only shown in idle state */}
        {publishState === "idle" && (
          <div className="px-6 pb-5">
            <Button
              type="button"
              className="w-full"
              disabled={!title.trim() || isPublishing}
              onClick={handlePublish}
              aria-busy={isPublishing}
            >
              {contentType === "short" ? "Publish Short" : "Publish Video"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
