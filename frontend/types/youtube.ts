export interface YouTubeCredentialsResponse {
  id: string;
  client_id: string;
  client_secret_masked: string;
  created_at: string;
  updated_at: string;
}

export interface YouTubeAccountResponse {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_handle: string | null;
  connected_at: string;
}

export interface YouTubeConnectResponse {
  auth_url: string;
}

export interface YouTubeUploadSettings {
  audience: "made_for_kids" | "not_made_for_kids";
  ai_disclosure: "none" | "contains_ai";
  category_id: string | null;
  license: "youtube" | "creativeCommon";
  allow_embedding: boolean;
  allow_remixing: boolean;
  notify_subscribers: boolean;
  automatic_chapters: boolean;
  automatic_places: boolean;
  automatic_concepts: boolean;
  recording_date: string | null;
  recording_location: string | null;
}

export const DEFAULT_UPLOAD_SETTINGS: YouTubeUploadSettings = {
  audience: "not_made_for_kids",
  ai_disclosure: "none",
  category_id: null,
  license: "youtube",
  allow_embedding: true,
  allow_remixing: true,
  notify_subscribers: true,
  automatic_chapters: true,
  automatic_places: true,
  automatic_concepts: true,
  recording_date: null,
  recording_location: null,
};

export interface YouTubeCategory {
  id: string;
  title: string;
}

export interface YouTubeCategoriesResponse {
  categories: YouTubeCategory[];
}

export interface YouTubePublishRequest {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  privacy_status: "private" | "unlisted" | "public";
  content_type?: string;
  playlist_id?: string | null;
  upload_settings?: YouTubeUploadSettings | null;
}

export interface YouTubePublishResponse {
  youtube_video_id: string;
  video_url: string;
  channel_name: string;
  channel_id: string;
  thumbnail_uploaded: boolean;
  thumbnail_error: string | null;
  playlist_added: boolean;
  playlist_error: string | null;
}

export interface YouTubePlaylist {
  youtube_playlist_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  item_count: number;
  synced_at: string;
}

export interface YouTubePlaylistListResponse {
  playlists: YouTubePlaylist[];
  total: number;
  synced_at: string | null;
}

export interface YouTubeChannelOption {
  channel_id: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
}

export interface YouTubePendingChannelsResponse {
  session_id: string;
  channels: YouTubeChannelOption[];
}
