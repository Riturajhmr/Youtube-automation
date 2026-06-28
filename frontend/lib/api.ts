import type { ApiError, ApiResult } from "@/types/api";
import type { HistoryItem, HistoryListResponse } from "@/types/history";
import type {
  MetadataGenerateRequest,
  MetadataGenerateResponse,
} from "@/types/metadata";
import type { VideoUploadResponse } from "@/types/video";
import type {
  YouTubeAccountResponse,
  YouTubeCategoriesResponse,
  YouTubeConnectResponse,
  YouTubeCredentialsResponse,
  YouTubePendingChannelsResponse,
  YouTubePlaylistListResponse,
  YouTubePublishRequest,
  YouTubePublishResponse,
} from "@/types/youtube";
import type {
  Workflow,
  WorkflowCreate,
  WorkflowListResponse,
  WorkflowUpdate,
} from "@/types/workflow";
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

// ---------------------------------------------------------------------------
// Authenticated helpers (reads auth-token cookie, includes Bearer header)
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth-token="));
  const token = match ? decodeURIComponent(match.split("=")[1]) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Safely parse a response body as JSON. Returns null if the body is not valid
// JSON (e.g. a plain-text "Internal Server Error" from a proxy failure).
async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function authedGet<T>(url: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...getAuthHeaders() },
    });
    const json = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: {
          error: (json?.error as string) ?? "Request failed",
          detail: (json?.detail as string) ?? `Server returned HTTP ${response.status}. Check that the backend is running.`,
          code: (json?.code as string) ?? "UNKNOWN_ERROR",
        },
      };
    }
    if (!json) {
      return { ok: false, error: { error: "Invalid response", detail: "Server returned a non-JSON response.", code: "PARSE_ERROR" } };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return {
      ok: false,
      error: {
        error: "Network error",
        detail: err instanceof Error ? err.message : "Could not connect to the server.",
        code: "NETWORK_ERROR",
      },
    };
  }
}

async function authedPost<TBody, T>(url: string, body: TBody): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    const json = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: {
          error: (json?.error as string) ?? "Request failed",
          detail: (json?.detail as string) ?? `Server returned HTTP ${response.status}. Check that the backend is running.`,
          code: (json?.code as string) ?? "UNKNOWN_ERROR",
        },
      };
    }
    if (!json) {
      return { ok: false, error: { error: "Invalid response", detail: "Server returned a non-JSON response.", code: "PARSE_ERROR" } };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return {
      ok: false,
      error: {
        error: "Network error",
        detail: err instanceof Error ? err.message : "Could not connect to the server.",
        code: "NETWORK_ERROR",
      },
    };
  }
}

async function authedPut<TBody, T>(url: string, body: TBody): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    const json = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: {
          error: (json?.error as string) ?? "Request failed",
          detail: (json?.detail as string) ?? `Server returned HTTP ${response.status}. Check that the backend is running.`,
          code: (json?.code as string) ?? "UNKNOWN_ERROR",
        },
      };
    }
    if (!json) {
      return { ok: false, error: { error: "Invalid response", detail: "Server returned a non-JSON response.", code: "PARSE_ERROR" } };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return {
      ok: false,
      error: {
        error: "Network error",
        detail: err instanceof Error ? err.message : "Could not connect to the server.",
        code: "NETWORK_ERROR",
      },
    };
  }
}

async function authedDelete(url: string): Promise<ApiResult<void>> {
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json", ...getAuthHeaders() },
    });
    if (response.status === 204) return { ok: true, data: undefined };
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: {
          error: (json as Record<string, string>).error ?? "Request failed",
          detail: (json as Record<string, string>).detail ?? `HTTP ${response.status}`,
          code: (json as Record<string, string>).code ?? "UNKNOWN_ERROR",
        },
      };
    }
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: {
        error: "Network error",
        detail: err instanceof Error ? err.message : "Could not connect to the server.",
        code: "NETWORK_ERROR",
      },
    };
  }
}

// ---------------------------------------------------------------------------
// YouTube API functions
// ---------------------------------------------------------------------------

export async function getYouTubeCredentials(): Promise<ApiResult<YouTubeCredentialsResponse>> {
  return authedGet<YouTubeCredentialsResponse>(ENDPOINTS.YOUTUBE_CREDENTIALS);
}

export async function saveYouTubeCredentials(data: {
  client_id: string;
  client_secret: string;
}): Promise<ApiResult<YouTubeCredentialsResponse>> {
  return authedPost<typeof data, YouTubeCredentialsResponse>(
    ENDPOINTS.YOUTUBE_CREDENTIALS,
    data
  );
}

export async function updateYouTubeCredentials(data: {
  client_id?: string;
  client_secret?: string;
}): Promise<ApiResult<YouTubeCredentialsResponse>> {
  return authedPut<typeof data, YouTubeCredentialsResponse>(
    ENDPOINTS.YOUTUBE_CREDENTIALS,
    data
  );
}

export async function deleteYouTubeCredentials(): Promise<ApiResult<void>> {
  return authedDelete(ENDPOINTS.YOUTUBE_CREDENTIALS);
}

export async function getYouTubeConnectUrl(): Promise<ApiResult<YouTubeConnectResponse>> {
  return authedGet<YouTubeConnectResponse>(ENDPOINTS.YOUTUBE_CONNECT);
}

export async function getYouTubeAccount(): Promise<ApiResult<YouTubeAccountResponse>> {
  return authedGet<YouTubeAccountResponse>(ENDPOINTS.YOUTUBE_ACCOUNT);
}

export async function disconnectYouTube(): Promise<ApiResult<void>> {
  return authedDelete(ENDPOINTS.YOUTUBE_DISCONNECT);
}

export async function publishToYouTube(
  data: YouTubePublishRequest
): Promise<ApiResult<YouTubePublishResponse>> {
  return authedPost<YouTubePublishRequest, YouTubePublishResponse>(
    ENDPOINTS.YOUTUBE_PUBLISH,
    data
  );
}

export async function getYouTubePlaylists(): Promise<ApiResult<YouTubePlaylistListResponse>> {
  return authedGet<YouTubePlaylistListResponse>(ENDPOINTS.YOUTUBE_PLAYLISTS);
}

export async function syncYouTubePlaylists(): Promise<ApiResult<YouTubePlaylistListResponse>> {
  return authedPost<Record<string, never>, YouTubePlaylistListResponse>(
    ENDPOINTS.YOUTUBE_PLAYLISTS_SYNC,
    {}
  );
}

export async function getYouTubeCategories(): Promise<ApiResult<YouTubeCategoriesResponse>> {
  return authedGet<YouTubeCategoriesResponse>(ENDPOINTS.YOUTUBE_CATEGORIES);
}

export async function getPendingChannels(
  sessionId: string
): Promise<ApiResult<YouTubePendingChannelsResponse>> {
  return authedGet<YouTubePendingChannelsResponse>(
    `${ENDPOINTS.YOUTUBE_CHANNELS_PENDING}?session_id=${encodeURIComponent(sessionId)}`
  );
}

export async function selectYouTubeChannel(data: {
  session_id: string;
  channel_id: string;
}): Promise<ApiResult<YouTubeAccountResponse>> {
  return authedPost<typeof data, YouTubeAccountResponse>(
    ENDPOINTS.YOUTUBE_CHANNELS_SELECT,
    data
  );
}

// ---------------------------------------------------------------------------
// History API functions
// ---------------------------------------------------------------------------

export async function getHistory(params: {
  page?: number;
  page_size?: number;
  filter?: string;
  search?: string;
}): Promise<ApiResult<HistoryListResponse>> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.filter) qs.set("filter", params.filter);
  if (params.search) qs.set("search", params.search);
  const query = qs.toString();
  return authedGet<HistoryListResponse>(
    `${ENDPOINTS.HISTORY_LIST}${query ? `?${query}` : ""}`
  );
}

export async function getHistoryItem(
  id: string
): Promise<ApiResult<HistoryItem>> {
  return authedGet<HistoryItem>(ENDPOINTS.HISTORY_ITEM(id));
}

export async function deleteHistoryItem(id: string): Promise<ApiResult<void>> {
  return authedDelete(ENDPOINTS.HISTORY_ITEM(id));
}

// ---------------------------------------------------------------------------
// Workflow API functions
// ---------------------------------------------------------------------------

export async function listWorkflows(): Promise<ApiResult<WorkflowListResponse>> {
  return authedGet<WorkflowListResponse>(ENDPOINTS.WORKFLOWS);
}

export async function createWorkflow(
  data: WorkflowCreate
): Promise<ApiResult<Workflow>> {
  return authedPost<WorkflowCreate, Workflow>(ENDPOINTS.WORKFLOWS, data);
}

export async function updateWorkflow(
  id: string,
  data: WorkflowUpdate
): Promise<ApiResult<Workflow>> {
  return authedPut<WorkflowUpdate, Workflow>(ENDPOINTS.WORKFLOW(id), data);
}

export async function deleteWorkflow(id: string): Promise<ApiResult<void>> {
  return authedDelete(ENDPOINTS.WORKFLOW(id));
}

export async function getDefaultWorkflow(): Promise<ApiResult<Workflow>> {
  return authedGet<Workflow>(ENDPOINTS.WORKFLOW_DEFAULT);
}

export async function setDefaultWorkflow(id: string): Promise<ApiResult<Workflow>> {
  return authedPost<Record<string, never>, Workflow>(
    ENDPOINTS.WORKFLOW_SET_DEFAULT(id),
    {}
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
