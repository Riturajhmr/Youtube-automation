"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileVideo, UploadCloud, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { videoUploadSchema } from "@/lib/validations";
import { ACCEPTED_VIDEO_EXTENSIONS, MAX_VIDEO_SIZE_MB } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

interface VideoUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function VideoUpload({ file, onFileChange }: VideoUploadProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formats = ACCEPTED_VIDEO_EXTENSIONS.map((ext) =>
    ext.replace(".", "").toUpperCase()
  );

  const validateAndSet = (f: File) => {
    const result = videoUploadSchema.safeParse({ file: f });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid file.");
      return;
    }
    setValidationError(null);
    onFileChange(f);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSet(f);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValidationError(null);
    onFileChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drop a video file here"
        className={[
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : file
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-border/80 hover:bg-muted/30",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
              <FileVideo className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-medium text-sm text-foreground truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove selected video"
              className="ml-2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted/60 mb-1">
              <UploadCloud className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Drop your video here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse files
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS.join(",")}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      {validationError && (
        <p role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      )}

      {/* Format + size info */}
      <div className="flex flex-wrap items-center gap-1.5">
        {formats.map((fmt) => (
          <Badge key={fmt} variant="secondary" className="text-xs font-mono tracking-wide">
            {fmt}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          Max {MAX_VIDEO_SIZE_MB} MB
        </span>
      </div>
    </div>
  );
}
