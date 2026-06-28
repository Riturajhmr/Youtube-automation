"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getYouTubeCategories } from "@/lib/api";
import type { YouTubeCategory, YouTubeUploadSettings } from "@/types/youtube";

// ------------------------------------------------------------------ //
// Local storage key + cache TTL for categories
// ------------------------------------------------------------------ //

const CATEGORIES_CACHE_KEY = "tubeflow_yt_categories";
const CATEGORIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCategories {
  categories: YouTubeCategory[];
  fetchedAt: number;
}

function loadCachedCategories(): YouTubeCategory[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedCategories = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CATEGORIES_CACHE_TTL_MS) return null;
    return parsed.categories;
  } catch {
    return null;
  }
}

function saveCachedCategories(categories: YouTubeCategory[]): void {
  try {
    const payload: CachedCategories = { categories, fetchedAt: Date.now() };
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable — ignore
  }
}

// ------------------------------------------------------------------ //
// Toggle Switch
// ------------------------------------------------------------------ //

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function ToggleSwitch({ id, checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
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

// ------------------------------------------------------------------ //
// Section divider
// ------------------------------------------------------------------ //

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 pt-1">
      {children}
    </p>
  );
}

// ------------------------------------------------------------------ //
// Main component
// ------------------------------------------------------------------ //

interface UploadSettingsPanelProps {
  value: YouTubeUploadSettings;
  onChange: (settings: YouTubeUploadSettings) => void;
}

export function UploadSettingsPanel({ value, onChange }: UploadSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<YouTubeCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const hasFetchedRef = useRef(false);

  const set = <K extends keyof YouTubeUploadSettings>(
    key: K,
    val: YouTubeUploadSettings[K]
  ) => onChange({ ...value, [key]: val });

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

  // Fetch categories when panel first opens
  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-700/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">YouTube Upload Settings</span>
          <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {/* Expandable body */}
      {isOpen && (
        <div className="px-4 pb-5 pt-2 space-y-5 border-t border-zinc-700/40">

          {/* ── Group 1: Content ── */}
          <SectionLabel>Content</SectionLabel>

          {/* Audience */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Audience</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="audience"
                  value="not_made_for_kids"
                  checked={value.audience === "not_made_for_kids"}
                  onChange={() => set("audience", "not_made_for_kids")}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">Not Made for Kids</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="audience"
                  value="made_for_kids"
                  checked={value.audience === "made_for_kids"}
                  onChange={() => set("audience", "made_for_kids")}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">Made for Kids</span>
              </label>
            </div>
            {value.audience === "made_for_kids" && (
              <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-md px-3 py-2">
                Features like comments, cards, and end screens are limited for content made for kids.
              </p>
            )}
          </div>

          {/* AI Generated Content Disclosure */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-disclosure" className="text-sm font-medium">
              AI-Generated Content
            </Label>
            <select
              id="ai-disclosure"
              value={value.ai_disclosure}
              onChange={(e) =>
                set("ai_disclosure", e.target.value as YouTubeUploadSettings["ai_disclosure"])
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="none">No AI-generated altered content</option>
              <option value="contains_ai">Contains AI-generated altered content</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Disclose if your video contains realistic AI-generated faces, voices, or footage.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <button
                type="button"
                onClick={() => fetchCategories(true)}
                disabled={isLoadingCategories}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label="Refresh categories"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoadingCategories ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
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
                id="category"
                value={value.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a category…</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── Group 2: Rights & Distribution ── */}
          <SectionLabel>Rights &amp; Distribution</SectionLabel>

          {/* License */}
          <div className="space-y-1.5">
            <Label htmlFor="license" className="text-sm font-medium">License</Label>
            <select
              id="license"
              value={value.license}
              onChange={(e) =>
                set("license", e.target.value as YouTubeUploadSettings["license"])
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="youtube">Standard YouTube License</option>
              <option value="creativeCommon">Creative Commons — Attribution</option>
            </select>
          </div>

          {/* Allow Embedding */}
          <ToggleSwitch
            id="allow-embedding"
            checked={value.allow_embedding}
            onChange={(v) => set("allow_embedding", v)}
            label="Allow Embedding"
            description="Let others embed your video on external sites."
          />

          {/* Allow Remixing */}
          <ToggleSwitch
            id="allow-remixing"
            checked={value.allow_remixing}
            onChange={(v) => set("allow_remixing", v)}
            label="Allow Remixing (Clips)"
            description="Let viewers create clips and remixes of your video."
          />

          {/* ── Group 3: Notifications & Features ── */}
          <SectionLabel>Notifications &amp; Features</SectionLabel>

          <ToggleSwitch
            id="notify-subscribers"
            checked={value.notify_subscribers}
            onChange={(v) => set("notify_subscribers", v)}
            label="Notify Subscribers"
            description="Send a notification to your subscribers when this video goes public."
          />

          <ToggleSwitch
            id="automatic-chapters"
            checked={value.automatic_chapters}
            onChange={(v) => set("automatic_chapters", v)}
            label="Automatic Chapters"
            description="Let YouTube automatically add chapters based on your video's content."
          />

          <ToggleSwitch
            id="automatic-places"
            checked={value.automatic_places}
            onChange={(v) => set("automatic_places", v)}
            label="Automatic Places"
            description="Allow YouTube to detect and tag locations shown in your video."
          />

          <ToggleSwitch
            id="automatic-concepts"
            checked={value.automatic_concepts}
            onChange={(v) => set("automatic_concepts", v)}
            label="Automatic Concepts"
            description="Allow YouTube to automatically tag topics and concepts in your video."
          />

          {/* ── Group 4: Recording Details ── */}
          <SectionLabel>Recording Details</SectionLabel>

          {/* Recording Date */}
          <div className="space-y-1.5">
            <Label htmlFor="recording-date" className="text-sm font-medium">
              Recording Date
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <input
              id="recording-date"
              type="date"
              value={value.recording_date ?? ""}
              onChange={(e) => set("recording_date", e.target.value || null)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [color-scheme:dark]"
            />
          </div>

          {/* Recording Location */}
          <div className="space-y-1.5">
            <Label htmlFor="recording-location" className="text-sm font-medium">
              Recording Location
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <input
              id="recording-location"
              type="text"
              value={value.recording_location ?? ""}
              onChange={(e) => set("recording_location", e.target.value || null)}
              placeholder="e.g. New York, USA"
              maxLength={500}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

        </div>
      )}
    </div>
  );
}
