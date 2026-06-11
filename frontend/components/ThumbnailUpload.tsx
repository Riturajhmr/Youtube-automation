"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { thumbnailUploadSchema } from "@/lib/validations";
import { ACCEPTED_THUMBNAIL_EXTENSIONS, MAX_THUMBNAIL_SIZE_MB } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

interface ThumbnailUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function ThumbnailUpload({ file, onChange }: ThumbnailUploadProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manage object URL lifecycle
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validateAndSet = (f: File) => {
    const result = thumbnailUploadSchema.safeParse({ file: f });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid file.");
      return;
    }
    setValidationError(null);
    onChange(f);
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

  const handleRemove = () => {
    setValidationError(null);
    onChange(null);
  };

  const formats = ACCEPTED_THUMBNAIL_EXTENSIONS.map((ext) =>
    ext.replace(".", "").toUpperCase()
  );

  if (file && previewUrl) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/20 aspect-video max-h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Thumbnail preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => inputRef.current?.click()}
              aria-label="Replace thumbnail"
            >
              <RefreshCw className="w-3 h-3" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={handleRemove}
              aria-label="Remove thumbnail"
            >
              <X className="w-3 h-3" />
              Remove
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {file.name} · {formatBytes(file.size)}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_THUMBNAIL_EXTENSIONS.join(",")}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drop a thumbnail image here"
        className={[
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
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
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted/60 mb-1">
            <ImagePlus className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Drop your thumbnail here
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse · helps AI align title with visuals
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_THUMBNAIL_EXTENSIONS.join(",")}
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

      <div className="flex flex-wrap items-center gap-1.5">
        {formats.map((fmt) => (
          <Badge key={fmt} variant="secondary" className="text-xs font-mono tracking-wide">
            {fmt}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          Max {MAX_THUMBNAIL_SIZE_MB} MB
        </span>
      </div>
    </div>
  );
}
