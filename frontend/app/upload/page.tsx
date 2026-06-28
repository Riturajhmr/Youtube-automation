"use client";

import { useEffect, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VideoUpload } from "@/components/VideoUpload";
import { ThumbnailUpload } from "@/components/ThumbnailUpload";
import { KeywordInput } from "@/components/KeywordInput";
import { ContextInput } from "@/components/ContextInput";
import { TranscriptSourceSelector } from "@/components/TranscriptSourceSelector";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { MetadataEditor } from "@/components/MetadataEditor";
import { ErrorState } from "@/components/ErrorState";
import { useUploadWorkflow } from "@/hooks/useUploadWorkflow";
import { listWorkflows } from "@/lib/api";
import { DEFAULT_UPLOAD_FORM_DATA } from "@/types/upload";
import type { UploadFormData } from "@/types/upload";
import type { Workflow, WorkflowConfig } from "@/types/workflow";
import { TITLE_HINT_MAX_LENGTH } from "@/lib/constants";

// --- Section label used throughout the form ---
function SectionLabel({
  children,
  optional,
  htmlFor,
}: {
  children: React.ReactNode;
  optional?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-baseline gap-2 text-sm font-medium text-foreground"
    >
      {children}
      {optional && (
        <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
      )}
    </label>
  );
}

export default function UploadPage() {
  const [formData, setFormData] = useState<UploadFormData>(DEFAULT_UPLOAD_FORM_DATA);
  const workflow = useUploadWorkflow();

  // Workflow selector state
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [hasFetchedWorkflows, setHasFetchedWorkflows] = useState(false);

  const selectedWorkflowConfig: WorkflowConfig | null =
    savedWorkflows.find((w) => w.id === selectedWorkflowId)?.config ?? null;

  const update = <K extends keyof UploadFormData>(key: K, value: UploadFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnalyze = () => {
    workflow.start(formData);
  };

  const handleReset = () => {
    setFormData(DEFAULT_UPLOAD_FORM_DATA);
    setSelectedWorkflowId("");
    workflow.reset();
  };

  const isCollecting = workflow.phase === "collecting" || workflow.phase === "error";
  const isProcessing = workflow.phase === "uploading" || workflow.phase === "processing";
  const isReviewing = workflow.phase === "reviewing";

  // Fetch saved workflows once when entering the reviewing phase
  useEffect(() => {
    if (!isReviewing || hasFetchedWorkflows) return;
    setHasFetchedWorkflows(true);
    listWorkflows().then((result) => {
      if (result.ok) {
        setSavedWorkflows(result.data.items);
        const defaultWorkflow = result.data.items.find((w) => w.is_default);
        if (defaultWorkflow) {
          setSelectedWorkflowId(defaultWorkflow.id);
        }
      }
    });
  }, [isReviewing, hasFetchedWorkflows]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          </div>
          <span className="font-semibold text-foreground text-sm">TubeFlow</span>
          <span className="text-border/60 text-xs select-none">|</span>
          <span className="text-muted-foreground text-xs hidden sm:inline">
            Upload & Generate Metadata
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">

          {/* Hero */}
          {isCollecting && (
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
                Generate YouTube Metadata
              </h1>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Upload your video and provide context to generate professional,
                SEO-optimised metadata in seconds.
              </p>
            </div>
          )}

          {/* ── COLLECTION FORM ── */}
          {isCollecting && (
            <div className="space-y-7">

              {/* Error banner (stays above form on retry) */}
              {workflow.phase === "error" && workflow.error && (
                <ErrorState error={workflow.error} onRetry={handleReset} />
              )}

              {/* Section 1 — Video Upload */}
              <div className="space-y-2">
                <SectionLabel>
                  Upload Video
                  <span className="text-xs font-normal text-destructive">*</span>
                </SectionLabel>
                <VideoUpload
                  file={formData.videoFile}
                  onFileChange={(f) => update("videoFile", f)}
                />
              </div>

              <Separator className="opacity-20" />

              {/* Section 2 — Thumbnail */}
              <div className="space-y-2">
                <SectionLabel>
                  Upload Thumbnail
                  <span className="text-xs font-normal text-destructive">*</span>
                </SectionLabel>
                <ThumbnailUpload
                  file={formData.thumbnailFile}
                  onChange={(f) => update("thumbnailFile", f)}
                />
              </div>

              <Separator className="opacity-20" />

              {/* Section 3 — Title Hint */}
              <div className="space-y-2">
                <SectionLabel htmlFor="title-hint" optional>
                  Title Hint
                </SectionLabel>
                <Input
                  id="title-hint"
                  value={formData.titleHint}
                  onChange={(e) => update("titleHint", e.target.value)}
                  maxLength={TITLE_HINT_MAX_LENGTH}
                  placeholder="e.g. Romantic Hindi Love Song"
                  aria-describedby="title-hint-desc"
                />
                <p id="title-hint-desc" className="text-xs text-muted-foreground">
                  Steer the AI toward the style or angle you have in mind.
                </p>
              </div>

              {/* Section 4 — Target Keywords */}
              <div className="space-y-2">
                <SectionLabel optional>Target Keywords</SectionLabel>
                <KeywordInput
                  keywords={formData.targetKeywords}
                  onChange={(kws) => update("targetKeywords", kws)}
                />
              </div>

              <Separator className="opacity-20" />

              {/* Section 5 — Context */}
              <div className="space-y-2">
                <SectionLabel htmlFor="user-context" optional>
                  Video Description / Context
                </SectionLabel>
                <ContextInput
                  value={formData.userContext}
                  onChange={(v) => update("userContext", v)}
                />
              </div>

              <Separator className="opacity-20" />

              {/* Section 6 — Transcript Source */}
              <div className="space-y-2">
                <SectionLabel>Transcript Source</SectionLabel>
                <TranscriptSourceSelector
                  source={formData.transcriptSource}
                  onSourceChange={(s) => update("transcriptSource", s)}
                  transcriptFile={formData.transcriptFile}
                  transcriptText={formData.transcriptText}
                  onFileChange={(f) => update("transcriptFile", f)}
                  onTextChange={(t) => update("transcriptText", t)}
                />
              </div>

              {/* CTA */}
              <div className="pt-2">
                <Button
                  type="button"
                  size="lg"
                  className="w-full gap-2.5 font-semibold"
                  disabled={!formData.videoFile || !formData.thumbnailFile}
                  onClick={handleAnalyze}
                  aria-busy={false}
                >
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                  Analyze Video
                </Button>
                {(!formData.videoFile || !formData.thumbnailFile) && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {!formData.videoFile
                      ? "Select a video file above to continue."
                      : "Upload a thumbnail to continue."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-foreground mb-1 tracking-tight">
                  Analyzing Your Video
                </h1>
                <p className="text-muted-foreground text-sm">
                  This usually takes 30–60 seconds. Don&apos;t close this tab.
                </p>
              </div>
              <ProcessingStatus
                phase={workflow.phase as "uploading" | "processing"}
                uploadProgress={workflow.uploadProgress}
                hasThumbnail={formData.thumbnailFile !== null}
                hasContext={formData.userContext.trim().length > 0}
              />
            </div>
          )}

          {/* ── REVIEW ── */}
          {isReviewing && workflow.result && workflow.videoId && (
            <div className="space-y-4">
              <div className="mb-2">
                <h1 className="text-xl font-bold text-foreground mb-1 tracking-tight">
                  Review Your Metadata
                </h1>
                <p className="text-muted-foreground text-sm">
                  Edit any field before you publish. Changes are saved locally.
                </p>
              </div>

              {/* Content type summary card */}
              <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Detected as</span>
                  {workflow.contentType === "short" ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 tracking-wide">
                      SHORT
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300 border border-zinc-600/40 tracking-wide">
                      VIDEO
                    </span>
                  )}
                </div>
                {workflow.durationSeconds !== null && (
                  <span className="text-xs text-muted-foreground">
                    Duration: <span className="text-foreground">{Math.round(workflow.durationSeconds)}s</span>
                  </span>
                )}
                {workflow.aspectRatio && (
                  <span className="text-xs text-muted-foreground">
                    Aspect Ratio: <span className="text-foreground">{workflow.aspectRatio}</span>
                  </span>
                )}
              </div>

              {/* Workflow selector */}
              {savedWorkflows.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-3 space-y-2">
                  <label
                    htmlFor="workflow-selector"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Selected Workflow
                  </label>
                  <select
                    id="workflow-selector"
                    value={selectedWorkflowId}
                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">No Workflow</option>
                    {savedWorkflows.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}{w.is_default ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedWorkflowConfig && (
                    <p className="text-xs text-muted-foreground">
                      Publish settings will be pre-filled from this workflow. You can still edit everything before publishing.
                    </p>
                  )}
                </div>
              )}

              <MetadataEditor
                initialMetadata={workflow.result}
                videoId={workflow.videoId}
                filename={formData.videoFile?.name ?? ""}
                thumbnailFile={formData.thumbnailFile}
                contentType={workflow.contentType}
                initialWorkflowConfig={selectedWorkflowConfig}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                Start Over
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
