"use client";

import { useState } from "react";
import { Youtube } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/TagInput";
import { PublishModal } from "@/components/PublishModal";
import type { MetadataGenerateResponse } from "@/types/metadata";
import type { WorkflowConfig } from "@/types/workflow";

interface MetadataEditorProps {
  initialMetadata: MetadataGenerateResponse;
  videoId: string;
  filename: string;
  thumbnailFile: File | null;
  contentType?: string;
  initialWorkflowConfig?: WorkflowConfig | null;
}

export function MetadataEditor({
  initialMetadata,
  videoId,
  filename,
  thumbnailFile,
  contentType = "video",
  initialWorkflowConfig = null,
}: MetadataEditorProps) {
  const [title, setTitle] = useState(initialMetadata.title);
  const [description, setDescription] = useState(initialMetadata.description);
  const [tags, setTags] = useState<string[]>(initialMetadata.tags);
  const [showPublish, setShowPublish] = useState(false);

  const titleLength = title.length;
  const isIdealTitleLength = titleLength >= 50 && titleLength <= 70;
  const isShort = contentType === "short";

  return (
    <article aria-label="Metadata editor" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generated Metadata</CardTitle>
            <div className="flex items-center gap-2">
              {isShort ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 tracking-wide">
                  SHORT
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300 border border-zinc-600/40 tracking-wide">
                  VIDEO
                </span>
              )}
              <Badge variant="secondary">{tags.length} tags</Badge>
            </div>
          </div>
          <CardDescription className="truncate" title={filename}>
            {filename}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`title-${videoId}`}>Title</Label>
              <span
                className={`text-xs font-mono ${
                  isIdealTitleLength ? "text-emerald-400" : "text-amber-400"
                }`}
                aria-live="polite"
              >
                {titleLength} / 100
              </span>
            </div>
            <Input
              id={`title-${videoId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              aria-describedby={`title-hint-${videoId}`}
            />
            <p
              id={`title-hint-${videoId}`}
              className="text-xs text-muted-foreground"
            >
              {isShort
                ? "Ideal: 15–40 characters for YouTube Shorts"
                : "Ideal: 50–70 characters for YouTube SEO"}
            </p>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor={`desc-${videoId}`}>Description</Label>
            <Textarea
              id={`desc-${videoId}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              maxLength={5000}
              className="resize-y min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length} / 5000
            </p>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tags</Label>
              <span className="text-xs text-muted-foreground">
                {tags.length} / 30
              </span>
            </div>
            <TagInput
              tags={tags}
              onChange={setTags}
              maxTags={30}
              placeholder="Add a tag and press Enter…"
            />
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add · Click × to remove
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Publish CTA */}
      <Button
        type="button"
        className="w-full gap-2"
        onClick={() => setShowPublish(true)}
      >
        <Youtube className="w-4 h-4" aria-hidden="true" />
        Publish To YouTube
      </Button>

      <PublishModal
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        videoId={videoId}
        initialTitle={title}
        initialDescription={description}
        initialTags={tags}
        thumbnailFile={thumbnailFile}
        contentType={contentType}
        workflowConfig={initialWorkflowConfig}
      />
    </article>
  );
}
