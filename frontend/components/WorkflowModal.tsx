"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useYouTubePlaylists } from "@/hooks/useYouTube";
import { createWorkflow, getYouTubeCategories, updateWorkflow } from "@/lib/api";
import type { YouTubeCategory } from "@/types/youtube";
import type { Workflow, WorkflowConfig } from "@/types/workflow";
import { DEFAULT_WORKFLOW_CONFIG } from "@/types/workflow";

// ------------------------------------------------------------------ //
// Local helpers
// ------------------------------------------------------------------ //

const CATEGORIES_CACHE_KEY = "tubeflow_yt_categories";
const CATEGORIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCachedCategories(): YouTubeCategory[] | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CATEGORIES_CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { categories: YouTubeCategory[]; fetchedAt: number };
    if (Date.now() - parsed.fetchedAt > CATEGORIES_CACHE_TTL_MS) return null;
    return parsed.categories;
  } catch {
    return null;
  }
}

function saveCachedCategories(cats: YouTubeCategory[]): void {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify({ categories: cats, fetchedAt: Date.now() }));
  } catch {
    // localStorage unavailable — ignore
  }
}

// ------------------------------------------------------------------ //
// Sub-components
// ------------------------------------------------------------------ //

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

function ToggleSwitch({ id, checked, onChange, label }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer flex-1">
        {label}
      </Label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          checked ? "bg-primary" : "bg-zinc-700"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 pt-2 border-t border-zinc-700/40">
      {children}
    </p>
  );
}

// ------------------------------------------------------------------ //
// Props
// ------------------------------------------------------------------ //

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkflow: Workflow | null;
  onSaved: (workflow: Workflow) => void;
}

// ------------------------------------------------------------------ //
// Component
// ------------------------------------------------------------------ //

export function WorkflowModal({
  isOpen,
  onClose,
  initialWorkflow,
  onSaved,
}: WorkflowModalProps) {
  const isEditing = initialWorkflow !== null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [config, setConfig] = useState<WorkflowConfig>(DEFAULT_WORKFLOW_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<YouTubeCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const hasFetchedCategoriesRef = useRef(false);

  const { data: playlistData } = useYouTubePlaylists();
  const playlists = playlistData?.playlists ?? [];

  // Reset form when modal opens / switches between create and edit
  useEffect(() => {
    if (!isOpen) return;
    if (initialWorkflow) {
      setName(initialWorkflow.name);
      setDescription(initialWorkflow.description ?? "");
      setIsDefault(initialWorkflow.is_default);
      setConfig({ ...DEFAULT_WORKFLOW_CONFIG, ...initialWorkflow.config });
    } else {
      setName("");
      setDescription("");
      setIsDefault(false);
      setConfig(DEFAULT_WORKFLOW_CONFIG);
    }
    setErrorMessage(null);
    setIsSaving(false);
    hasFetchedCategoriesRef.current = false;
  }, [isOpen, initialWorkflow]);

  // Fetch categories on open
  useEffect(() => {
    if (!isOpen || hasFetchedCategoriesRef.current) return;
    hasFetchedCategoriesRef.current = true;
    const cached = loadCachedCategories();
    if (cached) {
      setCategories(cached);
      return;
    }
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchCategories = async (force = false) => {
    if (!force) {
      const cached = loadCachedCategories();
      if (cached) {
        setCategories(cached);
        return;
      }
    }
    setIsLoadingCategories(true);
    const result = await getYouTubeCategories();
    setIsLoadingCategories(false);
    if (result.ok && result.data.categories.length > 0) {
      setCategories(result.data.categories);
      saveCachedCategories(result.data.categories);
    }
  };

  const setConfigField = <K extends keyof WorkflowConfig>(key: K, value: WorkflowConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage("Workflow name is required.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      config,
      is_default: isDefault,
    };

    const result = isEditing
      ? await updateWorkflow(initialWorkflow.id, payload)
      : await createWorkflow(payload);

    setIsSaving(false);
    if (result.ok) {
      onSaved(result.data);
      onClose();
    } else {
      setErrorMessage(result.error.detail ?? "Failed to save workflow.");
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-modal-title"
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
          <h2 id="workflow-modal-title" className="text-base font-semibold text-foreground">
            {isEditing ? "Edit Workflow" : "New Workflow"}
          </h2>
          {!isSaving && (
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
        <div className="px-6 py-5 max-h-[76vh] overflow-y-auto space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">
              Workflow Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              placeholder="e.g. Standard Upload, Music Video, Short"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-description">
              Description
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="wf-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Describe when to use this workflow…"
              className="resize-none"
            />
          </div>

          {/* Set as Default */}
          <ToggleSwitch
            id="wf-is-default"
            checked={isDefault}
            onChange={setIsDefault}
            label="Set as Default Workflow"
          />

          <SectionDivider>Publishing Settings</SectionDivider>

          {/* Privacy */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-privacy">Privacy</Label>
            <select
              id="wf-privacy"
              value={config.privacy}
              onChange={(e) => setConfigField("privacy", e.target.value as WorkflowConfig["privacy"])}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>

          {/* Content Type */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-content-type">Content Type</Label>
            <select
              id="wf-content-type"
              value={config.content_type}
              onChange={(e) => setConfigField("content_type", e.target.value as WorkflowConfig["content_type"])}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="video">Video</option>
              <option value="short">Short</option>
            </select>
          </div>

          {/* Playlist */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-playlist">
              YouTube Playlist
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <select
              id="wf-playlist"
              value={config.playlist_id ?? ""}
              onChange={(e) => setConfigField("playlist_id", e.target.value || null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No Playlist</option>
              {playlists.map((p) => (
                <option key={p.youtube_playlist_id} value={p.youtube_playlist_id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <SectionDivider>Content</SectionDivider>

          {/* Audience */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Audience</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="wf-audience"
                  checked={!config.made_for_kids}
                  onChange={() => setConfigField("made_for_kids", false)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">Not Made for Kids</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="wf-audience"
                  checked={config.made_for_kids}
                  onChange={() => setConfigField("made_for_kids", true)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">Made for Kids</span>
              </label>
            </div>
          </div>

          {/* AI Disclosure */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-ai-disclosure">AI-Generated Content</Label>
            <select
              id="wf-ai-disclosure"
              value={config.ai_disclosure}
              onChange={(e) => setConfigField("ai_disclosure", e.target.value as WorkflowConfig["ai_disclosure"])}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="none">No AI-generated altered content</option>
              <option value="contains_ai">Contains AI-generated altered content</option>
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="wf-category">
                Category
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <button
                type="button"
                onClick={() => fetchCategories(true)}
                disabled={isLoadingCategories}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label="Refresh categories"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingCategories ? "animate-spin" : ""}`} aria-hidden="true" />
                {isLoadingCategories ? "Loading…" : "Refresh"}
              </button>
            </div>
            {isLoadingCategories ? (
              <div className="flex items-center gap-2 rounded-md border border-zinc-700/60 bg-zinc-800/40 px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Loading categories…</span>
              </div>
            ) : (
              <select
                id="wf-category"
                value={config.category_id ?? ""}
                onChange={(e) => setConfigField("category_id", e.target.value || null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <SectionDivider>Rights &amp; Distribution</SectionDivider>

          {/* License */}
          <div className="space-y-1.5">
            <Label htmlFor="wf-license">License</Label>
            <select
              id="wf-license"
              value={config.license}
              onChange={(e) => setConfigField("license", e.target.value as WorkflowConfig["license"])}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="youtube">Standard YouTube License</option>
              <option value="creativeCommon">Creative Commons — Attribution</option>
            </select>
          </div>

          <ToggleSwitch
            id="wf-allow-embedding"
            checked={config.allow_embedding}
            onChange={(v) => setConfigField("allow_embedding", v)}
            label="Allow Embedding"
          />

          <ToggleSwitch
            id="wf-allow-remixing"
            checked={config.allow_remixing}
            onChange={(v) => setConfigField("allow_remixing", v)}
            label="Allow Remixing (Clips)"
          />

          <SectionDivider>Notifications &amp; Features</SectionDivider>

          <ToggleSwitch
            id="wf-notify-subscribers"
            checked={config.notify_subscribers}
            onChange={(v) => setConfigField("notify_subscribers", v)}
            label="Notify Subscribers"
          />

          <ToggleSwitch
            id="wf-automatic-chapters"
            checked={config.automatic_chapters}
            onChange={(v) => setConfigField("automatic_chapters", v)}
            label="Automatic Chapters"
          />

          <ToggleSwitch
            id="wf-automatic-places"
            checked={config.automatic_places}
            onChange={(v) => setConfigField("automatic_places", v)}
            label="Automatic Places"
          />

          <ToggleSwitch
            id="wf-automatic-concepts"
            checked={config.automatic_concepts}
            onChange={(v) => setConfigField("automatic_concepts", v)}
            label="Automatic Concepts"
          />

          <SectionDivider>Generation Options</SectionDivider>

          <ToggleSwitch
            id="wf-generate-metadata"
            checked={config.generate_metadata}
            onChange={(v) => setConfigField("generate_metadata", v)}
            label="Generate Metadata"
          />

          <ToggleSwitch
            id="wf-upload-thumbnail"
            checked={config.upload_thumbnail}
            onChange={(v) => setConfigField("upload_thumbnail", v)}
            label="Upload Thumbnail"
          />

          {/* Error */}
          {errorMessage && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-zinc-800 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Workflow"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
