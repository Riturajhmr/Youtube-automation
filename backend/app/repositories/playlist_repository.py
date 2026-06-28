from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube_playlist import YouTubePlaylist


class PlaylistRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all_by_user(self, user_id: uuid.UUID) -> list[YouTubePlaylist]:
        result = await self._session.execute(
            select(YouTubePlaylist)
            .where(YouTubePlaylist.user_id == user_id)
            .order_by(YouTubePlaylist.title)
        )
        return list(result.scalars().all())

    async def upsert_many(
        self,
        user_id: uuid.UUID,
        playlists: list[dict],
        synced_at: datetime,
    ) -> list[YouTubePlaylist]:
        """Insert or update playlists using PostgreSQL ON CONFLICT DO UPDATE."""
        if not playlists:
            return []

        values = [
            {
                "id": uuid.uuid4(),
                "user_id": user_id,
                "youtube_playlist_id": p["youtube_playlist_id"],
                "title": p["title"],
                "description": p.get("description"),
                "thumbnail_url": p.get("thumbnail_url"),
                "item_count": p.get("item_count", 0),
                "synced_at": synced_at,
            }
            for p in playlists
        ]

        stmt = pg_insert(YouTubePlaylist).values(values)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_user_playlist",
            set_={
                "title": stmt.excluded.title,
                "description": stmt.excluded.description,
                "thumbnail_url": stmt.excluded.thumbnail_url,
                "item_count": stmt.excluded.item_count,
                "synced_at": stmt.excluded.synced_at,
            },
        )
        await self._session.execute(stmt)
        await self._session.flush()

        return await self.get_all_by_user(user_id)

    async def delete_stale(
        self, user_id: uuid.UUID, keep_ids: list[str]
    ) -> None:
        """Remove playlists that are no longer present on the channel."""
        if not keep_ids:
            await self._session.execute(
                delete(YouTubePlaylist).where(YouTubePlaylist.user_id == user_id)
            )
        else:
            await self._session.execute(
                delete(YouTubePlaylist).where(
                    YouTubePlaylist.user_id == user_id,
                    YouTubePlaylist.youtube_playlist_id.notin_(keep_ids),
                )
            )
        await self._session.flush()
