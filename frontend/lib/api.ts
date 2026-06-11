import type { ApiError, ApiResult } from "@/types/api";
import type {
  MetadataGenerateRequest,
  MetadataGenerateResponse,
} from "@/types/metadata";
import type { VideoUploadResponse } from "@/types/video";
import { ENDPOINTS } from "@/lib/constants";

async function post<TBody, TResponse>(
  url: string,
  body: TBody
): Promise<ApiResult<TResponse>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await response.json();

    if (!response.ok) {
      const apiError: ApiError = {
        error: json.error ?? "Request failed",
        detail: json.detail ?? `HTTP ${response.status}`,
        code: json.code ?? "UNKNOWN_ERROR",
      };
      return { ok: false, error: apiError };
    }

    return { ok: true, data: json as TResponse };
  } catch (err) {
    const apiError: ApiError = {
      error: "Network error",
      detail:
        err instanceof Error
          ? err.message
          : "Could not connect to the server. Check your connection and try again.",
      code: "NETWORK_ERROR",
    };
    return { ok: false, error: apiError };
  }
}

export async function generateMetadata(
  request: MetadataGenerateRequest
): Promise<ApiResult<MetadataGenerateResponse>> {
  return post<MetadataGenerateRequest, MetadataGenerateResponse>(
    ENDPOINTS.METADATA_GENERATE,
    request
  );
}

export interface UploadVideoContext {
  titleHint?: string;
  targetKeywords?: string[];
  userContext?: string;
  thumbnailFile?: File | null;
  transcriptFile?: File | null;
  transcriptText?: string;
}

/**
 * Upload a video file with progress tracking.
 *
 * Uses XMLHttpRequest instead of fetch because the Fetch API does not expose
 * upload progress events in a cross-browser way.
 *
 * Never rejects — always resolves with { ok: false } on network/abort errors
 * so callers handle errors the same way as other ApiResult responses.
 */
export function uploadVideo(
  file: File,
  onProgress: (percent: number) => void,
  context?: UploadVideoContext
): Promise<ApiResult<VideoUploadResponse>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    if (context) {
      if (context.titleHint?.trim()) {
        formData.append("title_hint", context.titleHint.trim());
      }
      if (context.targetKeywords?.length) {
        formData.append("target_keywords", JSON.stringify(context.targetKeywords));
      }
      if (context.userContext?.trim()) {
        formData.append("extra_context", context.userContext.trim());
      }
      if (context.thumbnailFile) {
        formData.append("thumbnail", context.thumbnailFile);
      }
      if (context.transcriptFile) {
        formData.append("transcript_file", context.transcriptFile);
      } else if (context.transcriptText?.trim()) {
        const textFile = new File(
          [context.transcriptText.trim()],
          "transcript.txt",
          { type: "text/plain" }
        );
        formData.append("transcript_file", textFile);
      }
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        resolve({
          ok: false,
          error: {
            error: "Invalid server response",
            detail: "Server returned a non-JSON response.",
            code: "PARSE_ERROR",
          },
        });
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, data: json as unknown as VideoUploadResponse });
      } else {
        resolve({
          ok: false,
          error: {
            error: (json.error as string) ?? "Upload failed",
            detail: (json.detail as string) ?? `HTTP ${xhr.status}`,
            code: (json.code as string) ?? "UPLOAD_ERROR",
          },
        });
      }
    });

    xhr.addEventListener("error", () => {
      resolve({
        ok: false,
        error: {
          error: "Network error",
          detail: "Could not connect to the server.",
          code: "NETWORK_ERROR",
        },
      });
    });

    xhr.addEventListener("abort", () => {
      resolve({
        ok: false,
        error: {
          error: "Upload cancelled",
          detail: "The upload was aborted.",
          code: "UPLOAD_ABORTED",
        },
      });
    });

    // Do NOT set Content-Type manually — browser sets multipart/form-data with boundary automatically
    xhr.open("POST", ENDPOINTS.VIDEO_UPLOAD);
    xhr.send(formData);
  });
}
