"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoUploadForm } from "@/components/forms/VideoUploadForm";
import { MetadataEditor } from "@/components/MetadataEditor";
import { useUploadVideo } from "@/hooks/useVideos";

export default function VideoUploadPage() {
  const { uploadState, uploadProgress, result, error, upload, reset } =
    useUploadVideo();

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Upload Video</h1>
        <p className="text-muted-foreground mt-1">
          Upload your video to automatically generate YouTube metadata.
        </p>
      </header>

      {/* Upload form — shown while idle or actively uploading */}
      {(uploadState === "idle" || uploadState === "uploading") && (
        <VideoUploadForm
          onUpload={upload}
          uploadState={uploadState}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Processing skeleton — server received file, pipeline running */}
      {(uploadState === "processing" || uploadState === "generating") && (
        <section
          aria-live="polite"
          aria-label="Processing status"
          className="space-y-4"
        >
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2
              className="w-5 h-5 animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm font-medium">
              {uploadState === "processing"
                ? "Processing video…"
                : "Generating metadata with AI…"}
            </span>
          </div>
          <div className="space-y-3 rounded-lg border p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </section>
      )}

      {/* Metadata editor — shown after successful processing */}
      {uploadState === "complete" && result && (
        <div className="space-y-4">
          <MetadataEditor
            initialMetadata={result.metadata}
            videoId={result.video_id}
            filename={result.filename}
          />
          <Button variant="outline" onClick={reset} className="w-full">
            Upload Another Video
          </Button>
        </div>
      )}

      {/* Error state */}
      {uploadState === "error" && error && (
        <section role="alert" className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-1">
            <p className="font-medium text-destructive">{error.message}</p>
            <p className="text-sm text-muted-foreground">{error.detail}</p>
            <p className="text-xs font-mono text-muted-foreground/60">
              Code: {error.code}
            </p>
          </div>
          <Button variant="outline" onClick={reset} className="w-full">
            Try Again
          </Button>
        </section>
      )}
    </main>
  );
}
