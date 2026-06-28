from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.metadata import MetadataGenerateResponse


class VideoUploadResponse(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    video_id: str = Field(description="UUID identifying this upload")
    filename: str = Field(description="Original filename as provided by the client")
    status: Literal["processed"]
    metadata: MetadataGenerateResponse
    content_type: Literal["video", "short"] = "video"
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
