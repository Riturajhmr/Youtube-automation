from __future__ import annotations

import asyncio
import uuid
from datetime import timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import YouTubePublishError
from app.core.logging import get_logger
from app.core.security import decrypt_value
from app.repositories.youtube_repository import YouTubeRepository
from app.schemas.youtube import YouTubeCategory

logger = get_logger(__name__)

_TOKEN_URI = "https://oauth2.googleapis.com/token"


def _fetch_categories(
    access_token: str,
    refresh_token: str,
    client_id: str,
    client_secret: str,
    token_expiry: object,
    region_code: str = "US",
) -> list[YouTubeCategory]:
    """Fetch assignable YouTube video categories (synchronous, runs in thread pool)."""
    try:
        from google.oauth2.credentials import Credentials as GoogleCredentials  # type: ignore[import-untyped]
        from googleapiclient.discovery import build  # type: ignore[import-untyped]
    except ImportError as exc:
        raise YouTubePublishError(
            "Google client libraries are not installed.", code="MISSING_DEPENDENCY"
        ) from exc

    expiry = token_expiry
    if expiry is not None and expiry.tzinfo is not None:
        expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)

    google_creds = GoogleCredentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=_TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        expiry=expiry,
    )

    youtube = build("youtube", "v3", credentials=google_creds, cache_discovery=False)

    try:
        response = (
            youtube.videoCategories()
            .list(part="snippet", regionCode=region_code, hl="en")
            .execute()
        )
    except Exception as exc:
        logger.warning("YouTube categories API call failed: %s", exc)
        return []

    items = response.get("items", [])
    categories = [
        YouTubeCategory(id=item["id"], title=item["snippet"]["title"])
        for item in items
        if item.get("snippet", {}).get("assignable", False)
    ]
    categories.sort(key=lambda c: c.title)
    logger.info("Fetched %d YouTube categories for region=%s", len(categories), region_code)
    return categories


class YouTubeCategoriesService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = YouTubeRepository(session)

    async def get_categories(
        self, user_id: uuid.UUID, region_code: str = "US"
    ) -> list[YouTubeCategory]:
        """Return YouTube video categories for the connected channel's region.

        Returns an empty list on any error — never raises so publish flows are unblocked.
        """
        account = await self._repo.get_account(user_id)
        if not account:
            return []

        creds = await self._repo.get_credentials(user_id)
        if not creds:
            return []

        access_token = decrypt_value(account.access_token)
        refresh_token = (
            decrypt_value(account.refresh_token) if account.refresh_token else None
        )
        client_secret = decrypt_value(creds.client_secret)

        if not refresh_token:
            return []

        try:
            return await asyncio.to_thread(
                _fetch_categories,
                access_token,
                refresh_token,
                creds.client_id,
                client_secret,
                account.token_expiry,
                region_code,
            )
        except Exception as exc:
            logger.warning("Failed to fetch YouTube categories (non-fatal): %s", exc)
            return []
