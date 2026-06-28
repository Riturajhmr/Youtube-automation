from __future__ import annotations

import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class HistoryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    project_id: str | None
    video_title: str
    description: str | None
    tags: List[str] | None
    youtube_video_id: str
    youtube_url: str
    privacy_status: str
    published_at: datetime
    status: str
    thumbnail_url: str | None
    content_type: str = "video"
    created_at: datetime


class HistoryListResponse(BaseModel):
    items: List[HistoryItemResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
