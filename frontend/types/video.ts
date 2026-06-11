import type { MetadataGenerateResponse } from "@/types/metadata";

export interface VideoUploadResponse {
  video_id: string;
  filename: string;
  status: "processed";
  metadata: MetadataGenerateResponse;
}

export type UploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "generating"
  | "complete"
  | "error";
