"use client";

import { Textarea } from "@/components/ui/textarea";
import { USER_CONTEXT_MAX_LENGTH } from "@/lib/constants";

interface ContextInputProps {
  value: string;
  onChange: (value: string) => void;
}

const PLACEHOLDER = `Describe what this video is about in your own words.

Examples:
• Target audience and their experience level
• Main topic or problem being solved
• Tone — casual, technical, motivating, educational
• Desired outcome for the viewer
• Any important context the AI should know`;

export function ContextInput({ value, onChange }: ContextInputProps) {
  return (
    <div className="space-y-2">
      <Textarea
        id="user-context"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={USER_CONTEXT_MAX_LENGTH}
        rows={6}
        placeholder={PLACEHOLDER}
        className="resize-none leading-relaxed text-sm placeholder:text-muted-foreground/50"
        aria-label="Video context description"
        aria-describedby="user-context-hint"
      />
      <div className="flex items-center justify-between">
        <p id="user-context-hint" className="text-xs text-muted-foreground">
          The more context you provide, the more relevant the metadata will be.
        </p>
        <span
          className="text-xs text-muted-foreground font-mono"
          aria-live="polite"
          aria-label={`${value.length} of ${USER_CONTEXT_MAX_LENGTH} characters used`}
        >
          {value.length} / {USER_CONTEXT_MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
