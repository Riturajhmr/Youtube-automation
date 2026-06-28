from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class WorkflowConfig(BaseModel):
    generate_metadata: bool = True
    generate_thumbnail: bool = False
    upload_thumbnail: bool = True
    publish_to_youtube: bool = True
    privacy: Literal["private", "unlisted", "public"] = "private"
    playlist_id: str | None = None
    made_for_kids: bool = False
    ai_disclosure: Literal["none", "contains_ai"] = "none"
    content_type: Literal["video", "short"] = "video"
    category_id: str | None = None
    notify_subscribers: bool = True
    allow_embedding: bool = True
    allow_remixing: bool = True
    license: Literal["youtube", "creativeCommon"] = "youtube"
    automatic_chapters: bool = True
    automatic_places: bool = True
    automatic_concepts: bool = True


class WorkflowCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    workflow_type: str = "standard"
    config: WorkflowConfig = Field(default_factory=WorkflowConfig)
    is_default: bool = False


class WorkflowUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    config: WorkflowConfig | None = None
    is_default: bool | None = None


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    workflow_type: str
    config: WorkflowConfig
    is_default: bool
    created_at: datetime
    updated_at: datetime


class WorkflowListResponse(BaseModel):
    items: list[WorkflowResponse]
    total: int
