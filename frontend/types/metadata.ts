export interface ChannelProfile {
  niche: string | null;
  tone: string | null;
  language: string | null;
  audience_size_tier: string | null;
}

export interface MetadataGenerateRequest {
  transcript: string;
  title_hint: string | null;
  target_keywords: string[];
  channel_profile: ChannelProfile | null;
}

export interface MetadataGenerateResponse {
  title: string;
  description: string;
  tags: string[];
}
