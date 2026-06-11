"use client";

import { useCallback, useRef, useState } from "react";
import { uploadVideo } from "@/services/videoService";
import { PROCESSING_TO_GENERATING_DELAY_MS } from "@/lib/constants";
import type { UploadState, VideoUploadResponse } from "@/types/video";

export class VideoApiError extends Error {
  readonly code: string;
  readonly detail: string;

  constructor(error: string, detail: string, code: string) {
    super(error);
    this.name = "VideoApiError";
    this.code = code;
    this.detail = detail;
  }
}

interface UseUploadVideoReturn {
  uploadState: UploadState;
  uploadProgress: number;
  result: VideoUploadResponse | null;
  error: VideoApiError | null;
  upload: (file: File) => Promise<void>;
  reset: () => void;
}

export function useUploadVideo(): UseUploadVideoReturn {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<VideoUploadResponse | null>(null);
  const [error, setError] = useState<VideoApiError | null>(null);
  const generatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (generatingTimerRef.current) {
      clearTimeout(generatingTimerRef.current);
      generatingTimerRef.current = null;
    }
    setUploadState("idle");
    setUploadProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File) => {
      reset();
      setUploadState("uploading");

      const response = await uploadVideo(file, (percent) => {
        setUploadProgress(percent);
        if (percent === 100) {
          // All bytes sent — server is now processing the pipeline
          setUploadState("processing");
          // Transition label after delay to show AI generation phase
          generatingTimerRef.current = setTimeout(() => {
            setUploadState("generating");
          }, PROCESSING_TO_GENERATING_DELAY_MS);
        }
      });

      // Clear timer immediately — response arrived before or after the delay
      if (generatingTimerRef.current) {
        clearTimeout(generatingTimerRef.current);
        generatingTimerRef.current = null;
      }

      if (!response.ok) {
        setUploadState("error");
        setError(
          new VideoApiError(
            response.error.error,
            response.error.detail,
            response.error.code
          )
        );
        return;
      }

      setResult(response.data);
      setUploadState("complete");
    },
    [reset]
  );

  return { uploadState, uploadProgress, result, error, upload, reset };
}
