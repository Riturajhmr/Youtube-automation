export interface WorkflowConfig {
  generate_metadata: boolean;
  generate_thumbnail: boolean;
  upload_thumbnail: boolean;
  publish_to_youtube: boolean;
  privacy: "private" | "unlisted" | "public";
  playlist_id: string | null;
  made_for_kids: boolean;
  ai_disclosure: "none" | "contains_ai";
  content_type: "video" | "short";
  category_id: string | null;
  notify_subscribers: boolean;
  allow_embedding: boolean;
  allow_remixing: boolean;
  license: "youtube" | "creativeCommon";
  automatic_chapters: boolean;
  automatic_places: boolean;
  automatic_concepts: boolean;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  generate_metadata: true,
  generate_thumbnail: false,
  upload_thumbnail: true,
  publish_to_youtube: true,
  privacy: "private",
  playlist_id: null,
  made_for_kids: false,
  ai_disclosure: "none",
  content_type: "video",
  category_id: null,
  notify_subscribers: true,
  allow_embedding: true,
  allow_remixing: true,
  license: "youtube",
  automatic_chapters: true,
  automatic_places: true,
  automatic_concepts: true,
};

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  workflow_type: string;
  config: WorkflowConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListResponse {
  items: Workflow[];
  total: number;
}

export interface WorkflowCreate {
  name: string;
  description?: string | null;
  workflow_type?: string;
  config: WorkflowConfig;
  is_default?: boolean;
}

export interface WorkflowUpdate {
  name?: string;
  description?: string | null;
  config?: WorkflowConfig;
  is_default?: boolean;
}
