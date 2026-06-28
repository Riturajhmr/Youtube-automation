// Proxy base: browser → Next.js server → FastAPI (suitable for small JSON payloads)
export const API_BASE_URL = "/api/backend";

// Direct base: browser → FastAPI (bypasses Next.js 10 MB body limit for video uploads)
export const DIRECT_API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

export const ENDPOINTS = {
  // Small JSON — safe through the Next.js proxy
  METADATA_GENERATE: `${API_BASE_URL}/api/v1/metadata/generate`,
  // Large multipart — goes directly to FastAPI, skipping the proxy
  VIDEO_UPLOAD: `${DIRECT_API_URL}/api/v1/videos/upload`,
  // YouTube — authenticated JSON through the proxy
  YOUTUBE_CREDENTIALS: `${API_BASE_URL}/api/v1/youtube/credentials`,
  YOUTUBE_CONNECT: `${API_BASE_URL}/api/v1/youtube/connect`,
  YOUTUBE_ACCOUNT: `${API_BASE_URL}/api/v1/youtube/account`,
  YOUTUBE_DISCONNECT: `${API_BASE_URL}/api/v1/youtube/disconnect`,
  YOUTUBE_PUBLISH: `${API_BASE_URL}/api/v1/youtube/publish`,
  YOUTUBE_PLAYLISTS: `${API_BASE_URL}/api/v1/youtube/playlists`,
  YOUTUBE_PLAYLISTS_SYNC: `${API_BASE_URL}/api/v1/youtube/playlists/sync`,
  YOUTUBE_CHANNELS_PENDING: `${API_BASE_URL}/api/v1/youtube/channels/pending`,
  YOUTUBE_CHANNELS_SELECT: `${API_BASE_URL}/api/v1/youtube/channels/select`,
  YOUTUBE_CATEGORIES: `${API_BASE_URL}/api/v1/youtube/categories`,
  // History — authenticated JSON through the proxy
  HISTORY_LIST: `${API_BASE_URL}/api/v1/history`,
  HISTORY_ITEM: (id: string) => `${API_BASE_URL}/api/v1/history/${id}`,
  // Workflows — authenticated JSON through the proxy
  WORKFLOWS: `${API_BASE_URL}/api/v1/workflows`,
  WORKFLOW: (id: string) => `${API_BASE_URL}/api/v1/workflows/${id}`,
  WORKFLOW_DEFAULT: `${API_BASE_URL}/api/v1/workflows/default`,
  WORKFLOW_SET_DEFAULT: (id: string) => `${API_BASE_URL}/api/v1/workflows/${id}/default`,
} as const;

export const TRANSCRIPT_MIN_LENGTH = 50;
export const TRANSCRIPT_MAX_LENGTH = 50_000;
export const TITLE_HINT_MAX_LENGTH = 200;

// Video upload
export const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"] as const;
export const ACCEPTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",   // Chrome, Safari, most desktop OS
  "video/matroska",     // Firefox on Linux/Windows, some cross-platform tools
  "video/webm",
] as const;
export const MAX_VIDEO_SIZE_MB = 500;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

// Milliseconds after upload bytes complete before transitioning "processing" → "generating" label
export const PROCESSING_TO_GENERATING_DELAY_MS = 2000;

// Thumbnail upload
export const ACCEPTED_THUMBNAIL_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;
export const ACCEPTED_THUMBNAIL_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const MAX_THUMBNAIL_SIZE_MB = 10;
export const MAX_THUMBNAIL_SIZE_BYTES = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;

// Transcript file upload
export const ACCEPTED_TRANSCRIPT_EXTENSIONS = [".txt", ".srt", ".vtt", ".docx"] as const;
export const MAX_TRANSCRIPT_SIZE_MB = 5;
export const MAX_TRANSCRIPT_SIZE_BYTES = MAX_TRANSCRIPT_SIZE_MB * 1024 * 1024;

// Context + keyword input limits
export const USER_CONTEXT_MAX_LENGTH = 1000;
export const KEYWORD_MAX_COUNT = 15;
