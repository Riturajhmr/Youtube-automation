"use client";

import { ChangeEvent, useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { transcriptFileSchema } from "@/lib/validations";
import { ACCEPTED_TRANSCRIPT_EXTENSIONS, MAX_TRANSCRIPT_SIZE_MB } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

interface TranscriptUploadProps {
  file: File | null;
  text: string;
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
}

function stripSrtTimestamps(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => !/^\d+$/.test(line.trim()))
    .filter((line) => !/^\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripVttMetadata(raw: string): string {
  return raw
    .replace(/^WEBVTT.*$/m, "")
    .split("\n")
    .filter((line) => !/^\d{2}:\d{2}[:\.]/.test(line.trim()))
    .filter((line) => !line.trim().startsWith("NOTE"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function TranscriptUpload({
  file,
  text,
  onFileChange,
  onTextChange,
}: TranscriptUploadProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formats = ACCEPTED_TRANSCRIPT_EXTENSIONS.map((ext) =>
    ext.replace(".", "").toUpperCase()
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";

    const result = transcriptFileSchema.safeParse({ file: f });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Invalid file.");
      return;
    }
    setValidationError(null);

    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";

    if (ext === "docx") {
      // Cannot parse docx client-side; signal caller with empty text
      onFileChange(f);
      onTextChange("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      let raw = (ev.target?.result as string) ?? "";
      if (ext === "srt") raw = stripSrtTimestamps(raw);
      if (ext === "vtt") raw = stripVttMetadata(raw);
      onFileChange(f);
      onTextChange(raw);
    };
    reader.readAsText(f);
  };

  const handleRemove = () => {
    setValidationError(null);
    onFileChange(null);
    onTextChange("");
  };

  if (file) {
    const isDocx = file.name.toLowerCase().endsWith(".docx");
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(file.size)}
            {!isDocx && text && ` · ${countWords(text).toLocaleString()} words`}
            {isDocx && " · Will be extracted during processing"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          aria-label="Remove transcript file"
          className="h-7 w-7 p-0 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Click to upload a transcript file"
        className="border border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-border/80 hover:bg-muted/20 transition-all duration-200"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-1.5">
          <FileText className="w-6 h-6 text-muted-foreground mb-1" aria-hidden="true" />
          <p className="text-sm font-medium">Upload transcript file</p>
          <p className="text-xs text-muted-foreground">
            Already have a transcript? Upload it for higher-quality metadata.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TRANSCRIPT_EXTENSIONS.join(",")}
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
          Max {MAX_TRANSCRIPT_SIZE_MB} MB
        </span>
      </div>
    </div>
  );
}
