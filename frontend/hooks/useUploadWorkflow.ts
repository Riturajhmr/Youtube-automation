"use client";

import { useCallback, useRef, useState } from "react";
import { uploadVideo } from "@/services/videoService";
import type { MetadataGenerateResponse } from "@/types/metadata";
import type { UploadFormData, WorkflowPhase } from "@/types/upload";

export class WorkflowError extends Error {
  readonly code: string;
  readonly detail: string;

  constructor(message: string, code: string, detail: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
    this.detail = detail;
  }
}

interface UseUploadWorkflowReturn {
  phase: WorkflowPhase;
  uploadProgress: number;
  result: MetadataGenerateResponse | null;
  videoId: string | null;
  error: WorkflowError | null;
  contentType: "video" | "short";
  durationSeconds: number | null;
  aspectRatio: string | null;
  start: (formData: UploadFormData) => Promise<void>;
  reset: () => void;
}

export function useUploadWorkflow(): UseUploadWorkflowReturn {
  const [phase, setPhase] = useState<WorkflowPhase>("collecting");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<MetadataGenerateResponse | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<WorkflowError | null>(null);
  const [contentType, setContentType] = useState<"video" | "short">("video");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = false;
    setPhase("collecting");
    setUploadProgress(0);
    setResult(null);
    setVideoId(null);
    setError(null);
    setContentType("video");
    setDurationSeconds(null);
    setAspectRatio(null);
  }, []);

  const start = useCallback(
    async (formData: UploadFormData) => {
      if (!formData.videoFile) return;
      abortRef.current = false;

      setPhase("uploading");
      setUploadProgress(0);
      setResult(null);
      setVideoId(null);
      setError(null);
      setContentType("video");
      setDurationSeconds(null);
      setAspectRatio(null);

      // Upload the video with all context — backend handles transcript, metadata generation
      const uploadResponse = await uploadVideo(
        formData.videoFile,
        (percent) => {
          setUploadProgress(percent);
          if (percent === 100) setPhase("processing");
        },
        formData
      );

      if (abortRef.current) return;

      if (!uploadResponse.ok) {
        setPhase("error");
        setError(
          new WorkflowError(
            uploadResponse.error.error,
            uploadResponse.error.code,
            uploadResponse.error.detail
          )
        );
        return;
      }

      setVideoId(uploadResponse.data.video_id);
      setResult(uploadResponse.data.metadata);
      setContentType(uploadResponse.data.content_type ?? "video");
      setDurationSeconds(uploadResponse.data.duration_seconds ?? null);
      setAspectRatio(uploadResponse.data.aspect_ratio ?? null);
      setPhase("reviewing");
    },
    []
  );

  return { phase, uploadProgress, result, videoId, error, contentType, durationSeconds, aspectRatio, start, reset };
}
