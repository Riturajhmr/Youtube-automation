from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import YouTubePlaylistError
from app.core.logging import get_logger
from app.core.security import decrypt_value, encrypt_value
from app.models.youtube_playlist import YouTubePlaylist
from app.repositories.playlist_repository import PlaylistRepository
from app.repositories.youtube_repository import YouTubeRepository

logger = get_logger(__name__)

_TOKEN_URI = "https://oauth2.googleapis.com/token"


def _fetch_playlists_from_api(
    access_token: str,
    refresh_token: str,
    client_id: str,
    client_secret: str,
    token_expiry: object,
) -> tuple[list[dict], object, str]:
    """Fetch all playlists from YouTube API (synchronous, runs in thread pool).

    Returns (playlists, new_token, new_expiry) where new_token may have been
    refreshed by the Google client during the API call.
    """
    try:
        from google.oauth2.credentials import Credentials as GoogleCredentials  # type: ignore[import-untyped]
        from googleapiclient.discovery import build  # type: ignore[import-untyped]
        from googleapiclient.errors import HttpError  # type: ignore[import-untyped]
    except ImportError as exc:
        raise YouTubePlaylistError(
            "Google client libraries are not installed.", code="MISSING_DEPENDENCY"
        ) from exc

    # Strip tzinfo for google-auth compatibility (same as publish service)
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

    playlists: list[dict] = []
    page_token: str | None = None

    try:
        while True:
            kwargs: dict = {
                "part": "snippet,contentDetails",
                "mine": True,
                "maxResults": 50,
            }
            if page_token:
                kwargs["pageToken"] = page_token

            response = youtube.playlists().list(**kwargs).execute()

            for item in response.get("items", []):
                snippet = item.get("snippet", {})
                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("medium", {}).get("url")
                    or thumbnails.get("default", {}).get("url")
                )
                item_count = item.get("contentDetails", {}).get("itemCount", 0)

                playlists.append({
                    "youtube_playlist_id": item["id"],
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description") or None,
                    "thumbnail_url": thumbnail_url,
                    "item_count": int(item_count),
                })

            page_token = response.get("nextPageToken")
            if not page_token:
                break

    except HttpError as exc:
        reason = str(exc.reason) if hasattr(exc, "reason") else str(exc)
        status_code = exc.status_code if hasattr(exc, "status_code") else getattr(exc, "resp", {}).get("status", 0)
        if int(status_code) == 403 and (
            "rateLimitExceeded" in reason or "quotaExceeded" in reason
        ):
            raise YouTubePlaylistError(
                "YouTube API quota exceeded. Try again later.", code="QUOTA_EXCEEDED"
            ) from exc
        raise YouTubePlaylistError(
            f"Failed to fetch playlists: {reason}", code="FETCH_FAILED"
        ) from exc

    # Re-attach UTC tzinfo if Google refreshed the token
    returned_expiry = google_creds.expiry
    if returned_expiry is not None and returned_expiry.tzinfo is None:
        returned_expiry = returned_expiry.replace(tzinfo=timezone.utc)

    return playlists, google_creds.token, returned_expiry


class YouTubePlaylistService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = YouTubeRepository(session)
        self._playlist_repo = PlaylistRepository(session)

    async def get_playlists(self, user_id: uuid.UUID) -> list[YouTubePlaylist]:
        """Return cached playlists from DB without hitting the YouTube API."""
        return await self._playlist_repo.get_all_by_user(user_id)

    async def sync_playlists(self, user_id: uuid.UUID) -> list[YouTubePlaylist]:
        """Fetch playlists from YouTube API, update DB cache, return updated list."""
        account = await self._repo.get_account(user_id)
        if not account:
            raise YouTubePlaylistError(
                "No YouTube channel connected. Connect your channel in Settings first.",
                code="NOT_CONNECTED",
            )

        creds = await self._repo.get_credentials(user_id)
        if not creds:
            raise YouTubePlaylistError(
                "YouTube credentials not found. Save your OAuth credentials in Settings.",
                code="CREDENTIALS_MISSING",
            )

        access_token = decrypt_value(account.access_token)
        refresh_token = (
            decrypt_value(account.refresh_token) if account.refresh_token else None
        )
        client_secret = decrypt_value(creds.client_secret)

        if not refresh_token:
            raise YouTubePlaylistError(
                "No refresh token available. Reconnect your YouTube channel in Settings.",
                code="NO_REFRESH_TOKEN",
            )

        logger.info("Syncing playlists for user_id=%s", user_id)

        playlists, new_token, new_expiry = await asyncio.to_thread(
            _fetch_playlists_from_api,
            access_token,
            refresh_token,
            creds.client_id,
            client_secret,
            account.token_expiry,
        )

        # Persist refreshed access token if it changed (non-fatal)
        if new_token and new_token != access_token:
            try:
                await self._repo.update_account(
                    account,
                    channel_id=account.channel_id,
                    channel_name=account.channel_name,
                    channel_handle=account.channel_handle,
                    access_token_enc=encrypt_value(new_token),
                    refresh_token_enc=account.refresh_token,
                    token_expiry=new_expiry,
                )
            except Exception as exc:
                logger.warning("Failed to persist refreshed token after playlist sync: %s", exc)

        synced_at = datetime.now(tz=timezone.utc)
        keep_ids = [p["youtube_playlist_id"] for p in playlists]

        await self._playlist_repo.delete_stale(user_id, keep_ids)
        updated = await self._playlist_repo.upsert_many(user_id, playlists, synced_at)

        logger.info(
            "Playlist sync complete: user_id=%s, synced=%d playlists",
            user_id,
            len(updated),
        )
        return updated
