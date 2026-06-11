"use client";

import { TagInput } from "@/components/TagInput";
import { KEYWORD_MAX_COUNT } from "@/lib/constants";

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export function KeywordInput({ keywords, onChange }: KeywordInputProps) {
  return (
    <div className="space-y-2">
      <TagInput
        tags={keywords}
        onChange={onChange}
        maxTags={KEYWORD_MAX_COUNT}
        placeholder="e.g. fastapi, python, startup, love song…"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add · click × to remove
        </p>
        <span className="text-xs text-muted-foreground font-mono">
          {keywords.length} / {KEYWORD_MAX_COUNT}
        </span>
      </div>
    </div>
  );
}
