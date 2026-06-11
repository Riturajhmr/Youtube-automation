from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.services.metadata_engine import MetadataEngine
from app.services.video_processing_service import VideoProcessingService


def get_metadata_engine(request: Request) -> MetadataEngine:
    """Return the MetadataEngine singleton created in the lifespan context."""
    return request.app.state.metadata_engine


MetadataEngineDep = Annotated[MetadataEngine, Depends(get_metadata_engine)]


def get_video_processing_service(request: Request) -> VideoProcessingService:
    """Return the VideoProcessingService singleton created in the lifespan context."""
    return request.app.state.video_processing_service


VideoProcessingServiceDep = Annotated[VideoProcessingService, Depends(get_video_processing_service)]
