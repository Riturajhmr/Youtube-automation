"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  tags,
  onChange,
  maxTags = 30,
  placeholder = "Add tag…",
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    const alreadyExists = tags.some((t) => t.toLowerCase() === normalized);
    if (alreadyExists || tags.length >= maxTags) return;
    onChange([...tags, trimmed]);
    setInputValue("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 min-h-[42px] rounded-md border border-input bg-background px-3 py-2 cursor-text",
        className
      )}
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label="Tags"
    >
      {tags.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="secondary"
          className="gap-1 pr-1 cursor-default"
          role="listitem"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(index);
            }}
            aria-label={`Remove tag ${tag}`}
            className="rounded-full hover:bg-secondary-foreground/20 p-0.5"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </Badge>
      ))}
      {tags.length < maxTags && (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="border-0 shadow-none p-0 h-auto min-w-[120px] flex-1 focus-visible:ring-0 bg-transparent"
          aria-label="New tag input"
        />
      )}
    </div>
  );
}
