"use client";

import { TranscriptUpload } from "@/components/TranscriptUpload";

interface TranscriptSourceSelectorProps {
  source: "auto" | "manual";
  onSourceChange: (source: "auto" | "manual") => void;
  transcriptFile: File | null;
  transcriptText: string;
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
}

export function TranscriptSourceSelector({
  source,
  onSourceChange,
  transcriptFile,
  transcriptText,
  onFileChange,
  onTextChange,
}: TranscriptSourceSelectorProps) {
  return (
    <div className="space-y-3">
      {/* Radio options */}
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Transcript source">
        {(["auto", "manual"] as const).map((value) => {
          const id = `transcript-source-${value}`;
          const label =
            value === "auto" ? "Auto Generate Transcript" : "Upload Transcript File";
          const desc =
            value === "auto"
              ? "TubeFlow extracts the transcript from your video automatically."
              : "Upload an existing transcript for higher-accuracy metadata.";

          return (
            <label
              key={value}
              htmlFor={id}
              className={[
                "flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all duration-150",
                source === value
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/20",
              ].join(" ")}
            >
              <input
                id={id}
                type="radio"
                name="transcript-source"
                value={value}
                checked={source === value}
                onChange={() => onSourceChange(value)}
                className="mt-0.5 accent-primary"
                aria-describedby={`${id}-desc`}
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p id={`${id}-desc`} className="text-xs text-muted-foreground">
                  {desc}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Conditional transcript file upload */}
      {source === "manual" && (
        <div className="pt-1">
          <TranscriptUpload
            file={transcriptFile}
            text={transcriptText}
            onFileChange={onFileChange}
            onTextChange={onTextChange}
          />
        </div>
      )}
    </div>
  );
}
