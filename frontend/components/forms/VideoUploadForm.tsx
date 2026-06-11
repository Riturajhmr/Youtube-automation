"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileVideo, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { videoUploadSchema } from "@/lib/validations";
import { ACCEPTED_VIDEO_EXTENSIONS, MAX_VIDEO_SIZE_MB } from "@/lib/constants";
import type { UploadState } from "@/types/video";

interface VideoUploadFormProps {
  onUpload: (file: File) => void;
  uploadState: UploadState;
  uploadProgress: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoUploadForm({
  onUpload,
  uploadState,
  uploadProgress,
}: VideoUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploadState === "uploading";
  const isDisabled = isUploading;

  const validateAndSet = (file: File) => {
    const result = videoUploadSchema.safeParse({ file });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid file.");
      setSelectedFile(null);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
    // Reset input so the same file can be re-selected after an error
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSet(file);
  };

  const handleSubmit = () => {
    if (!selectedFile || isDisabled) return;
    onUpload(selectedFile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
        <CardDescription>
          Accepts {ACCEPTED_VIDEO_EXTENSIONS.join(", ")} · max{" "}
          {MAX_VIDEO_SIZE_MB / 1024} GB
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-label="Click or drop a video file here"
          aria-disabled={isDisabled}
          className={[
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isDisabled ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
          onClick={() => !isDisabled && inputRef.current?.click()}
          onKeyDown={(e) =>
            e.key === "Enter" && !isDisabled && inputRef.current?.click()
          }
          onDragOver={(e) => {
            e.preventDefault();
            if (!isDisabled) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <FileVideo
            className="mx-auto mb-3 w-10 h-10 text-muted-foreground"
            aria-hidden="true"
          />
          {selectedFile ? (
            <div>
              <p className="font-medium text-sm truncate max-w-xs mx-auto">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">Drop your video here</p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
          )}
        </div>

        {/* Hidden native file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_VIDEO_EXTENSIONS.join(",")}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />

        {/* Client-side validation error */}
        {validationError && (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        )}

        {/* Upload progress bar */}
        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress: ${uploadProgress}%`}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedFile || isDisabled}
          aria-busy={isUploading}
          className="w-full gap-2"
          size="lg"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {isUploading
            ? `Uploading ${uploadProgress}%…`
            : "Upload & Generate Metadata"}
        </Button>
      </CardFooter>
    </Card>
  );
}
