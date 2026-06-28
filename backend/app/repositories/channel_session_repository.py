from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube_channel_session import YouTubeChannelSession


class ChannelSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: uuid.UUID,
        access_token_enc: str,
        refresh_token_enc: str | None,
        token_expiry: datetime | None,
        available_channels: list[dict],
        expires_at: datetime,
    ) -> YouTubeChannelSession:
        obj = YouTubeChannelSession(
            id=uuid.uuid4(),
            user_id=user_id,
            access_token_enc=access_token_enc,
            refresh_token_enc=refresh_token_enc,
            token_expiry=token_expiry,
            available_channels=available_channels,
            expires_at=expires_at,
        )
        self._session.add(obj)
        await self._session.flush()
        return obj

    async def get(self, session_id: uuid.UUID) -> YouTubeChannelSession | None:
        now = datetime.now(timezone.utc)
        result = await self._session.execute(
            select(YouTubeChannelSession).where(
                YouTubeChannelSession.id == session_id,
                YouTubeChannelSession.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, obj: YouTubeChannelSession) -> None:
        await self._session.delete(obj)
        await self._session.flush()
