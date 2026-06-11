"use client";

import { useState } from "react";
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
import { DEFAULT_UPLOAD_FORM_DATA } from "@/types/upload";
import type { UploadFormData } from "@/types/upload";
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

  const update = <K extends keyof UploadFormData>(key: K, value: UploadFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnalyze = () => {
    workflow.start(formData);
  };

  const handleReset = () => {
    setFormData(DEFAULT_UPLOAD_FORM_DATA);
    workflow.reset();
  };

  const isCollecting = workflow.phase === "collecting" || workflow.phase === "error";
  const isProcessing = workflow.phase === "uploading" || workflow.phase === "processing";
  const isReviewing = workflow.phase === "reviewing";

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
                <SectionLabel optional>Upload Thumbnail</SectionLabel>
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
                  disabled={!formData.videoFile}
                  onClick={handleAnalyze}
                  aria-busy={false}
                >
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                  Analyze Video
                </Button>
                {!formData.videoFile && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Select a video file above to continue.
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
              <MetadataEditor
                initialMetadata={workflow.result}
                videoId={workflow.videoId}
                filename={formData.videoFile?.name ?? ""}
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
