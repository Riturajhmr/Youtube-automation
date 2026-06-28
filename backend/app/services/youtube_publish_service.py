from __future__ import annotations

import asyncio
import mimetypes
import uuid
from datetime import timezone
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import YouTubePublishError
from app.core.logging import get_logger
from app.core.security import decrypt_value, encrypt_value
from app.repositories.youtube_repository import YouTubeRepository
from app.schemas.youtube import YouTubePublishRequest, YouTubePublishResponse, YouTubeUploadSettings

logger = get_logger(__name__)

_TOKEN_URI = "https://oauth2.googleapis.com/token"


def _do_upload(
    access_token: str,
    refresh_token: str,
    client_id: str,
    client_secret: str,
    token_expiry: object,
    video_path: Path,
    thumbnail_path: Path | None,
    request: YouTubePublishRequest,
    playlist_id: str | None = None,
    upload_settings: YouTubeUploadSettings | None = None,
) -> tuple[str, object, str, bool, str | None, bool, str | None]:
    """Run the full synchronous YouTube upload inside a thread.

    Returns (youtube_video_id, new_token, new_expiry, thumbnail_uploaded,
    thumbnail_error, playlist_added, playlist_error).
    """
    try:
        from google.oauth2.credentials import Credentials as GoogleCredentials  # type: ignore[import-untyped]
        from googleapiclient.discovery import build  # type: ignore[import-untyped]
        from googleapiclient.errors import HttpError  # type: ignore[import-untyped]
        from googleapiclient.http import MediaFileUpload  # type: ignore[import-untyped]
    except ImportError as exc:
        raise YouTubePublishError(
            "Google client libraries are not installed.", code="MISSING_DEPENDENCY"
        ) from exc

    # google-auth's _helpers.utcnow() returns naive UTC (tzinfo stripped for
    # backward-compat with Python 3.12). Credentials.expired compares
    # utcnow() >= expiry, so expiry must also be naive UTC or the comparison
    # raises TypeError. Strip tzinfo here; re-attach when writing back to DB.
    expiry = token_expiry
    if expiry is not None and expiry.tzinfo is not None:
        expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)
    logger.info(
        "OAuth expiry: value=%s tzinfo=%s",
        expiry,
        expiry.tzinfo if expiry else None,
    )

    google_creds = GoogleCredentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=_TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        expiry=expiry,
    )

    mime_type = mimetypes.guess_type(str(video_path))[0] or "video/mp4"

    youtube = build("youtube", "v3", credentials=google_creds, cache_discovery=False)

    settings = upload_settings or YouTubeUploadSettings()

    body: dict = {
        "snippet": {
            "title": request.title,
            "description": request.description,
            "tags": request.tags,
            "categoryId": settings.category_id or "22",  # fallback: People & Blogs
        },
        "status": {
            "privacyStatus": request.privacy_status,
            "selfDeclaredMadeForKids": settings.audience == "made_for_kids",
            "license": settings.license,
            "embeddable": settings.allow_embedding,
            "notifySubscribers": settings.notify_subscribers,
        },
    }

    # recordingDetails — only include if at least one field is set
    recording: dict = {}
    if settings.recording_date:
        recording["recordingDate"] = settings.recording_date.isoformat()
    if settings.recording_location:
        recording["locationDescription"] = settings.recording_location
    if recording:
        body["recordingDetails"] = recording

    part = "snippet,status"
    if recording:
        part += ",recordingDetails"

    media = MediaFileUpload(
        str(video_path),
        mimetype=mime_type,
        resumable=True,
        chunksize=5 * 1024 * 1024,
    )
    insert_request = youtube.videos().insert(
        part=part,
        body=body,
        media_body=media,
    )

    try:
        response = None
        while response is None:
            _, response = insert_request.next_chunk()
    except HttpError as exc:
        reason = str(exc.reason) if hasattr(exc, "reason") else str(exc)
        status_code = exc.status_code if hasattr(exc, "status_code") else getattr(exc, "resp", {}).get("status", 0)
        if int(status_code) == 403 and (
            "rateLimitExceeded" in reason or "quotaExceeded" in reason
        ):
            raise YouTubePublishError(
                "YouTube API quota exceeded. Try again later.", code="QUOTA_EXCEEDED"
            ) from exc
        raise YouTubePublishError(
            f"YouTube upload failed: {reason}", code="UPLOAD_FAILED"
        ) from exc

    youtube_video_id: str = response["id"]
    logger.info("YouTube video insert succeeded: video_id=%s", youtube_video_id)

    # Thumbnail upload (non-fatal — video is already live even if this fails)
    thumbnail_uploaded = False
    thumbnail_error: str | None = None
    if thumbnail_path and thumbnail_path.exists():
        try:
            thumb_mime = mimetypes.guess_type(str(thumbnail_path))[0] or "image/jpeg"
            thumb_media = MediaFileUpload(str(thumbnail_path), mimetype=thumb_mime)
            youtube.thumbnails().set(
                videoId=youtube_video_id, media_body=thumb_media
            ).execute()
            thumbnail_uploaded = True
            logger.info("Thumbnail uploaded for video_id=%s", youtube_video_id)
        except Exception as thumb_exc:
            thumbnail_error = str(thumb_exc)
            logger.warning(
                "Thumbnail upload failed for video_id=%s: %s", youtube_video_id, thumb_exc
            )
    else:
        thumbnail_error = "Thumbnail file not found on server."
        logger.warning("Thumbnail file missing for video_id=%s", youtube_video_id)

    # Playlist insertion (non-fatal — video is already live even if this fails)
    playlist_added = False
    playlist_error: str | None = None
    if playlist_id:
        try:
            youtube.playlistItems().insert(
                part="snippet",
                body={
                    "snippet": {
                        "playlistId": playlist_id,
                        "resourceId": {
                            "kind": "youtube#video",
                            "videoId": youtube_video_id,
                        },
                    }
                },
            ).execute()
            playlist_added = True
            logger.info(
                "Video %s inserted into playlist %s", youtube_video_id, playlist_id
            )
        except Exception as playlist_exc:
            playlist_error = str(playlist_exc)
            logger.warning(
                "Playlist insert failed for video_id=%s playlist_id=%s: %s",
                youtube_video_id,
                playlist_id,
                playlist_exc,
            )

    # Google's expiry is always naive UTC after a refresh; re-attach UTC tzinfo
    # before returning so DB storage stays consistently tz-aware.
    returned_expiry = google_creds.expiry
    if returned_expiry is not None and returned_expiry.tzinfo is None:
        returned_expiry = returned_expiry.replace(tzinfo=timezone.utc)
    return (
        youtube_video_id,
        google_creds.token,
        returned_expiry,
        thumbnail_uploaded,
        thumbnail_error,
        playlist_added,
        playlist_error,
    )


class YouTubePublishService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._repo = YouTubeRepository(session)
        self._settings = settings or get_settings()

    async def publish(
        self, user_id: uuid.UUID, request: YouTubePublishRequest
    ) -> YouTubePublishResponse:
        # 1. Load connected YouTube account
        account = await self._repo.get_account(user_id)
        if not account:
            raise YouTubePublishError(
                "No YouTube channel connected. Connect your channel in Settings first.",
                code="NOT_CONNECTED",
            )

        # 2. Load OAuth credentials (needed for token refresh)
        creds = await self._repo.get_credentials(user_id)
        if not creds:
            raise YouTubePublishError(
                "YouTube credentials not found. Save your OAuth credentials in Settings.",
                code="CREDENTIALS_MISSING",
            )

        # 3. Decrypt stored tokens
        access_token = decrypt_value(account.access_token)
        refresh_token = (
            decrypt_value(account.refresh_token) if account.refresh_token else None
        )
        client_secret = decrypt_value(creds.client_secret)

        if not refresh_token:
            raise YouTubePublishError(
                "No refresh token available. Reconnect your YouTube channel in Settings.",
                code="NO_REFRESH_TOKEN",
            )

        # 4. Locate video file in upload directory
        upload_dir = Path(self._settings.UPLOAD_DIR)
        video_files = [
            p
            for p in upload_dir.glob(f"{request.video_id}_*")
            if "_thumbnail" not in p.name
        ]
        if not video_files:
            raise YouTubePublishError(
                f"Video file not found for id {request.video_id}.",
                code="VIDEO_NOT_FOUND",
            )
        video_path = video_files[0]

        # 5. Find persisted thumbnail (any image extension)
        _thumb_candidates = list(upload_dir.glob(f"{request.video_id}_thumbnail.*"))
        thumbnail_path = _thumb_candidates[0] if _thumb_candidates else None

        logger.info(
            "Starting YouTube publish: user_id=%s, video_path=%s, privacy=%s, playlist_id=%s",
            user_id,
            video_path.name,
            request.privacy_status,
            request.playlist_id,
        )

        # 6. Run blocking upload in thread pool
        try:
            (
                youtube_video_id,
                new_token,
                new_expiry,
                thumbnail_uploaded,
                thumbnail_error,
                playlist_added,
                playlist_error,
            ) = await asyncio.to_thread(
                _do_upload,
                access_token,
                refresh_token,
                creds.client_id,
                client_secret,
                account.token_expiry,
                video_path,
                thumbnail_path,
                request,
                request.playlist_id,
                request.upload_settings,
            )
        except YouTubePublishError:
            raise
        except Exception as exc:
            logger.error("YouTube publish unexpected error: %s", exc, exc_info=True)
            raise YouTubePublishError(
                f"Upload failed: {exc}", code="UPLOAD_FAILED"
            ) from exc

        # 7. Persist refreshed access token if it changed
        if new_token and new_token != access_token:
            logger.info(
                "Access token refreshed during publish, updating DB for user_id=%s", user_id
            )
            try:
                await self._repo.update_account(
                    account,
                    channel_id=account.channel_id,
                    channel_name=account.channel_name,
                    channel_handle=account.channel_handle,
                    access_token_enc=encrypt_value(new_token),
                    refresh_token_enc=account.refresh_token,  # keep existing encrypted value
                    token_expiry=new_expiry,
                )
            except Exception as exc:
                # Non-fatal — video is already published
                logger.warning("Failed to persist refreshed token: %s", exc)

        video_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
        logger.info(
            "YouTube publish complete: user_id=%s, youtube_video_id=%s, url=%s, "
            "playlist_id=%s, playlist_added=%s, playlist_error=%s",
            user_id,
            youtube_video_id,
            video_url,
            request.playlist_id,
            playlist_added,
            playlist_error,
        )

        # Record publication history — non-fatal, must never block a successful publish
        try:
            from app.services.history_service import HistoryService
            _thumb_url: str | None = None
            if thumbnail_path and thumbnail_path.exists():
                _thumb_url = f"/uploads/{thumbnail_path.name}"
            await HistoryService(self._session).record_publication(
                user_id=user_id,
                project_id=str(request.video_id),
                video_title=request.title,
                description=request.description,
                tags=list(request.tags),
                youtube_video_id=youtube_video_id,
                youtube_url=video_url,
                privacy_status=request.privacy_status,
                thumbnail_url=_thumb_url,
                content_type=request.content_type,
            )
            logger.info("Publish history recorded for youtube_video_id=%s", youtube_video_id)
        except Exception as _hist_exc:
            logger.warning("Failed to record publish history (non-fatal): %s", _hist_exc)

        # Persist upload settings — non-fatal
        if request.upload_settings:
            try:
                await self._save_upload_settings(user_id, request.video_id, request.upload_settings)
            except Exception as _settings_exc:
                logger.warning("Failed to save upload settings (non-fatal): %s", _settings_exc)

        return YouTubePublishResponse(
            youtube_video_id=youtube_video_id,
            video_url=video_url,
            channel_name=account.channel_name,
            channel_id=account.channel_id,
            thumbnail_uploaded=thumbnail_uploaded,
            thumbnail_error=thumbnail_error,
            playlist_added=playlist_added,
            playlist_error=playlist_error,
        )

    async def _save_upload_settings(
        self,
        user_id: uuid.UUID,
        video_id: str,
        settings: YouTubeUploadSettings,
    ) -> None:
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from app.models.youtube_upload_settings import YouTubeUploadSettings as SettingsModel

        values = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "video_id": video_id,
            "audience": settings.audience,
            "ai_disclosure": settings.ai_disclosure,
            "category_id": settings.category_id,
            "license": settings.license,
            "allow_embedding": settings.allow_embedding,
            "allow_remixing": settings.allow_remixing,
            "notify_subscribers": settings.notify_subscribers,
            "automatic_chapters": settings.automatic_chapters,
            "automatic_places": settings.automatic_places,
            "automatic_concepts": settings.automatic_concepts,
            "recording_date": settings.recording_date,
            "recording_location": settings.recording_location,
        }

        stmt = (
            pg_insert(SettingsModel)
            .values(**values)
            .on_conflict_do_update(
                constraint="uq_upload_settings_user_video",
                set_={k: v for k, v in values.items() if k not in ("id", "user_id", "video_id")},
            )
        )
        await self._session.execute(stmt)
        await self._session.commit()
        logger.info("Upload settings saved for user_id=%s video_id=%s", user_id, video_id)
