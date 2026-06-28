from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.youtube_publication import YouTubePublication
from app.repositories.history_repository import HistoryRepository
from app.schemas.history import HistoryItemResponse, HistoryListResponse

logger = get_logger(__name__)


class HistoryService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = HistoryRepository(session)

    async def record_publication(
        self,
        *,
        user_id: uuid.UUID,
        project_id: str | None,
        video_title: str,
        description: str | None,
        tags: list[str] | None,
        youtube_video_id: str,
        youtube_url: str,
        privacy_status: str,
        thumbnail_url: str | None = None,
        content_type: str = "video",
    ) -> YouTubePublication:
        return await self._repo.create(
            user_id=user_id,
            project_id=project_id,
            video_title=video_title,
            description=description,
            tags=tags,
            youtube_video_id=youtube_video_id,
            youtube_url=youtube_url,
            privacy_status=privacy_status,
            published_at=datetime.now(timezone.utc),
            status="published",
            thumbnail_url=thumbnail_url,
            content_type=content_type,
        )

    async def list_publications(
        self,
        user_id: uuid.UUID,
        *,
        page: int = 1,
        page_size: int = 20,
        filter: str | None = None,
        search: str | None = None,
    ) -> HistoryListResponse:
        items, total = await self._repo.list_by_user(
            user_id, page=page, page_size=page_size, filter=filter, search=search
        )
        return HistoryListResponse(
            items=[HistoryItemResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
        )

    async def get_publication(
        self, user_id: uuid.UUID, publication_id: uuid.UUID
    ) -> HistoryItemResponse:
        item = await self._repo.get_by_id(user_id, publication_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found.",
            )
        return HistoryItemResponse.model_validate(item)

    async def delete_publication(
        self, user_id: uuid.UUID, publication_id: uuid.UUID
    ) -> None:
        item = await self._repo.get_by_id(user_id, publication_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found.",
            )
        await self._repo.delete(item)
        logger.info(
            "History record deleted: publication_id=%s user_id=%s",
            publication_id,
            user_id,
        )
