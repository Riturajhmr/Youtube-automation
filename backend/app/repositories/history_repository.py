from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube_publication import YouTubePublication

_STATUS_VALUES = {"published", "failed"}
_PRIVACY_VALUES = {"private", "public", "unlisted"}
_CONTENT_TYPE_VALUES = {"video", "short"}


class HistoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
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
        published_at: datetime,
        status: str = "published",
        thumbnail_url: str | None = None,
        content_type: str = "video",
    ) -> YouTubePublication:
        publication = YouTubePublication(
            id=uuid.uuid4(),
            user_id=user_id,
            project_id=project_id,
            video_title=video_title,
            description=description,
            tags=tags,
            youtube_video_id=youtube_video_id,
            youtube_url=youtube_url,
            privacy_status=privacy_status,
            published_at=published_at,
            status=status,
            thumbnail_url=thumbnail_url,
            content_type=content_type,
        )
        self._session.add(publication)
        await self._session.flush()
        return publication

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        filter: str | None = None,
        search: str | None = None,
    ) -> tuple[list[YouTubePublication], int]:
        base = select(YouTubePublication).where(
            YouTubePublication.user_id == user_id
        )

        if filter:
            if filter in _STATUS_VALUES:
                base = base.where(YouTubePublication.status == filter)
            elif filter in _PRIVACY_VALUES:
                base = base.where(YouTubePublication.privacy_status == filter)
            elif filter in _CONTENT_TYPE_VALUES:
                base = base.where(YouTubePublication.content_type == filter)

        if search:
            pattern = f"%{search}%"
            base = base.where(
                or_(
                    YouTubePublication.video_title.ilike(pattern),
                    YouTubePublication.youtube_video_id.ilike(pattern),
                )
            )

        count_result = await self._session.execute(
            select(func.count()).select_from(base.subquery())
        )
        total: int = count_result.scalar_one()

        offset = (page - 1) * page_size
        data_result = await self._session.execute(
            base.order_by(YouTubePublication.published_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        items = list(data_result.scalars().all())
        return items, total

    async def get_by_id(
        self, user_id: uuid.UUID, publication_id: uuid.UUID
    ) -> YouTubePublication | None:
        result = await self._session.execute(
            select(YouTubePublication).where(
                YouTubePublication.id == publication_id,
                YouTubePublication.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, publication: YouTubePublication) -> None:
        await self._session.delete(publication)
        await self._session.flush()
