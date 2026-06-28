import type { MetadataGenerateResponse } from "@/types/metadata";

export interface VideoUploadResponse {
  video_id: string;
  filename: string;
  status: "processed";
  metadata: MetadataGenerateResponse;
  content_type: "video" | "short";
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
}

export type UploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "generating"
  | "complete"
  | "error";
