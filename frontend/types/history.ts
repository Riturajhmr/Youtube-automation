export interface HistoryItem {
  id: string;
  user_id: string;
  project_id: string | null;
  video_title: string;
  description: string | null;
  tags: string[] | null;
  youtube_video_id: string;
  youtube_url: string;
  privacy_status: "private" | "unlisted" | "public";
  published_at: string;
  status: string;
  thumbnail_url: string | null;
  content_type: string;
  created_at: string;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}
