from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class YouTubeCredentialsSave(BaseModel):
    client_id: str = Field(min_length=10, max_length=500)
    client_secret: str = Field(min_length=10, max_length=500)


class YouTubeCredentialsUpdate(BaseModel):
    client_id: str | None = Field(default=None, min_length=10, max_length=500)
    client_secret: str | None = Field(default=None, min_length=10, max_length=500)


class YouTubeCredentialsResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    client_id: str
    client_secret_masked: str = "••••••••"
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm(cls, obj: object) -> "YouTubeCredentialsResponse":
        return cls(
            id=obj.id,  # type: ignore[attr-defined]
            client_id=obj.client_id,  # type: ignore[attr-defined]
            client_secret_masked="••••••••",
            created_at=obj.created_at,  # type: ignore[attr-defined]
            updated_at=obj.updated_at,  # type: ignore[attr-defined]
        )


class YouTubeAccountResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    channel_id: str
    channel_name: str
    channel_handle: str | None
    connected_at: datetime

    @classmethod
    def from_orm(cls, obj: object) -> "YouTubeAccountResponse":
        return cls(
            id=obj.id,  # type: ignore[attr-defined]
            channel_id=obj.channel_id,  # type: ignore[attr-defined]
            channel_name=obj.channel_name,  # type: ignore[attr-defined]
            channel_handle=obj.channel_handle,  # type: ignore[attr-defined]
            connected_at=obj.connected_at,  # type: ignore[attr-defined]
        )


class YouTubeConnectResponse(BaseModel):
    auth_url: str


class YouTubePlaylistItem(BaseModel):
    model_config = {"from_attributes": True}

    youtube_playlist_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    item_count: int
    synced_at: datetime

    @classmethod
    def from_orm(cls, obj: object) -> "YouTubePlaylistItem":
        return cls(
            youtube_playlist_id=obj.youtube_playlist_id,  # type: ignore[attr-defined]
            title=obj.title,  # type: ignore[attr-defined]
            description=obj.description,  # type: ignore[attr-defined]
            thumbnail_url=obj.thumbnail_url,  # type: ignore[attr-defined]
            item_count=obj.item_count,  # type: ignore[attr-defined]
            synced_at=obj.synced_at,  # type: ignore[attr-defined]
        )


class YouTubePlaylistListResponse(BaseModel):
    playlists: list[YouTubePlaylistItem]
    total: int
    synced_at: Optional[datetime] = None


class YouTubeUploadSettings(BaseModel):
    audience: Literal["made_for_kids", "not_made_for_kids"] = "not_made_for_kids"
    ai_disclosure: Literal["none", "contains_ai"] = "none"
    category_id: Optional[str] = None
    license: Literal["youtube", "creativeCommon"] = "youtube"
    allow_embedding: bool = True
    allow_remixing: bool = True
    notify_subscribers: bool = True
    automatic_chapters: bool = True
    automatic_places: bool = True
    automatic_concepts: bool = True
    recording_date: Optional[date] = None
    recording_location: Optional[str] = None


class YouTubeCategory(BaseModel):
    id: str
    title: str


class YouTubeCategoriesResponse(BaseModel):
    categories: list[YouTubeCategory]


class YouTubePublishRequest(BaseModel):
    video_id: str
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=5000)
    tags: list[str] = Field(default_factory=list)
    privacy_status: Literal["private", "unlisted", "public"] = "private"
    content_type: str = "video"
    playlist_id: Optional[str] = None
    upload_settings: Optional[YouTubeUploadSettings] = None


class YouTubePublishResponse(BaseModel):
    youtube_video_id: str
    video_url: str
    channel_name: str
    channel_id: str
    thumbnail_uploaded: bool = False
    thumbnail_error: str | None = None
    playlist_added: bool = False
    playlist_error: str | None = None


class YouTubeChannelOption(BaseModel):
    channel_id: str
    channel_name: str
    channel_handle: str | None = None
    thumbnail_url: str | None = None


class YouTubePendingChannelsResponse(BaseModel):
    session_id: str
    channels: list[YouTubeChannelOption]


class YouTubeChannelSelectRequest(BaseModel):
    session_id: str
    channel_id: str
