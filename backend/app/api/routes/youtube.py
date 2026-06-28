from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, YouTubeCredentialError, YouTubeConnectionError, YouTubePlaylistError, YouTubePublishError
from app.core.logging import get_logger
from app.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.youtube import (
    YouTubeAccountResponse,
    YouTubeCategoriesResponse,
    YouTubeChannelSelectRequest,
    YouTubeConnectResponse,
    YouTubeCredentialsResponse,
    YouTubeCredentialsSave,
    YouTubeCredentialsUpdate,
    YouTubePendingChannelsResponse,
    YouTubePlaylistItem,
    YouTubePlaylistListResponse,
    YouTubePublishRequest,
    YouTubePublishResponse,
)
from app.services.auth_service import AuthService
from app.services.youtube_categories_service import YouTubeCategoriesService
from app.services.youtube_playlist_service import YouTubePlaylistService
from app.services.youtube_publish_service import YouTubePublishService
from app.services.youtube_service import YouTubeService

router = APIRouter(prefix="/youtube", tags=["YouTube"])
logger = get_logger(__name__)

_bearer = HTTPBearer(auto_error=False)


async def _get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token."
        )
    try:
        return await AuthService(session).get_current_user(credentials.credentials)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message
        ) from exc


CurrentUser = Annotated[UserResponse, Depends(_get_current_user)]


# ------------------------------------------------------------------ #
# Credentials endpoints                                               #
# ------------------------------------------------------------------ #


@router.post(
    "/credentials",
    response_model=YouTubeCredentialsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save YouTube OAuth credentials",
)
async def save_credentials(
    body: YouTubeCredentialsSave,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeCredentialsResponse:
    try:
        return await YouTubeService(session).save_credentials(user.id, body)
    except YouTubeCredentialError as exc:
        code = status.HTTP_409_CONFLICT if exc.code == "CREDENTIALS_ALREADY_EXIST" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=exc.message) from exc


@router.get(
    "/credentials",
    response_model=YouTubeCredentialsResponse,
    summary="Get saved YouTube credentials (secret masked)",
)
async def get_credentials(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeCredentialsResponse:
    result = await YouTubeService(session).get_credentials(user.id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No credentials saved."
        )
    return result


@router.put(
    "/credentials",
    response_model=YouTubeCredentialsResponse,
    summary="Update YouTube OAuth credentials",
)
async def update_credentials(
    body: YouTubeCredentialsUpdate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeCredentialsResponse:
    try:
        return await YouTubeService(session).update_credentials(user.id, body)
    except YouTubeCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=exc.message
        ) from exc


@router.delete(
    "/credentials",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete YouTube credentials and disconnect channel",
)
async def delete_credentials(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await YouTubeService(session).delete_credentials(user.id)
    except YouTubeCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=exc.message
        ) from exc


# ------------------------------------------------------------------ #
# OAuth flow                                                           #
# ------------------------------------------------------------------ #


@router.get(
    "/connect",
    response_model=YouTubeConnectResponse,
    summary="Get Google OAuth URL to connect YouTube channel",
)
async def get_connect_url(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeConnectResponse:
    try:
        auth_url = await YouTubeService(session).get_connect_url(user.id)
        return YouTubeConnectResponse(auth_url=auth_url)
    except YouTubeCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        ) from exc
    except YouTubeConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=exc.message
        ) from exc


@router.get(
    "/callback",
    summary="OAuth callback from Google — redirects back to frontend",
    include_in_schema=False,
)
async def youtube_callback(
    session: Annotated[AsyncSession, Depends(get_db)],
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    settings = get_settings()
    frontend_settings = f"{settings.FRONTEND_URL}/settings"

    if error or not code or not state:
        logger.warning(
            "YouTube OAuth callback: denied or missing params — error=%r, has_code=%s, has_state=%s",
            error, bool(code), bool(state),
        )
        return RedirectResponse(
            url=f"{frontend_settings}?error=access_denied",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        result = await YouTubeService(session).handle_callback(code, state)
        if isinstance(result, str):
            # Multiple channels — redirect to frontend channel picker
            logger.info(
                "YouTube OAuth callback: multiple channels found, redirecting to channel picker, session=%s",
                result,
            )
            return RedirectResponse(
                url=f"{frontend_settings}?youtube_session={result}",
                status_code=status.HTTP_302_FOUND,
            )
        logger.info("YouTube OAuth callback: single channel auto-connected, redirecting to settings")
        return RedirectResponse(
            url=f"{frontend_settings}?connected=true",
            status_code=status.HTTP_302_FOUND,
        )
    except (YouTubeCredentialError, YouTubeConnectionError) as exc:
        logger.error(
            "YouTube OAuth callback: connection failed — code=%s, detail=%s",
            exc.code, exc.message,
            exc_info=True,
        )
        return RedirectResponse(
            url=f"{frontend_settings}?error={exc.code}",
            status_code=status.HTTP_302_FOUND,
        )


# ------------------------------------------------------------------ #
# Channel selection (multi-channel accounts)                          #
# ------------------------------------------------------------------ #

_CODE_TO_STATUS: dict[str, int] = {
    "SESSION_INVALID": status.HTTP_400_BAD_REQUEST,
    "SESSION_EXPIRED": status.HTTP_400_BAD_REQUEST,
    "CHANNEL_NOT_FOUND": status.HTTP_400_BAD_REQUEST,
    "CREDENTIALS_MISSING": status.HTTP_400_BAD_REQUEST,
    "NOT_CONNECTED": status.HTTP_400_BAD_REQUEST,
    "NO_REFRESH_TOKEN": status.HTTP_400_BAD_REQUEST,
    "VIDEO_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "QUOTA_EXCEEDED": status.HTTP_429_TOO_MANY_REQUESTS,
    "MISSING_DEPENDENCY": status.HTTP_500_INTERNAL_SERVER_ERROR,
}


@router.get(
    "/channels/pending",
    response_model=YouTubePendingChannelsResponse,
    summary="Get channels available for selection in a pending OAuth session",
)
async def get_pending_channels(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
    session_id: str = Query(...),
) -> YouTubePendingChannelsResponse:
    try:
        return await YouTubeService(session).get_pending_channels(user.id, session_id)
    except YouTubeConnectionError as exc:
        raise HTTPException(
            status_code=_CODE_TO_STATUS.get(exc.code, status.HTTP_400_BAD_REQUEST),
            detail=exc.message,
        ) from exc


@router.post(
    "/channels/select",
    response_model=YouTubeAccountResponse,
    status_code=status.HTTP_200_OK,
    summary="Select a YouTube channel from a pending OAuth session to complete connection",
)
async def select_channel(
    body: YouTubeChannelSelectRequest,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeAccountResponse:
    try:
        return await YouTubeService(session).complete_channel_selection(
            user.id, body.session_id, body.channel_id
        )
    except YouTubeConnectionError as exc:
        raise HTTPException(
            status_code=_CODE_TO_STATUS.get(exc.code, status.HTTP_400_BAD_REQUEST),
            detail=exc.message,
        ) from exc


# ------------------------------------------------------------------ #
# Account                                                              #
# ------------------------------------------------------------------ #


@router.get(
    "/account",
    response_model=YouTubeAccountResponse,
    summary="Get connected YouTube channel info",
)
async def get_account(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeAccountResponse:
    logger.debug("GET /account: looking up YouTube account for user_id=%s", user.id)
    result = await YouTubeService(session).get_account(user.id)
    if not result:
        logger.warning("GET /account: no YouTube account found for user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No YouTube channel connected."
        )
    logger.debug(
        "GET /account: returning account for user_id=%s, channel_id=%s",
        user.id, result.channel_id,
    )
    return result


@router.delete(
    "/disconnect",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Disconnect YouTube channel (keeps credentials)",
)
async def disconnect(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await YouTubeService(session).disconnect(user.id)
    except YouTubeCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=exc.message
        ) from exc


# ------------------------------------------------------------------ #
# Playlists                                                            #
# ------------------------------------------------------------------ #

@router.get(
    "/playlists",
    response_model=YouTubePlaylistListResponse,
    summary="Get cached playlists for the connected YouTube channel",
    description=(
        "Returns playlists stored in the local cache. Call POST /playlists/sync "
        "first to populate. Returns an empty list if no sync has been performed yet."
    ),
)
async def get_playlists(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubePlaylistListResponse:
    playlists = await YouTubePlaylistService(session).get_playlists(user.id)
    items = [YouTubePlaylistItem.from_orm(p) for p in playlists]
    synced_at = items[0].synced_at if items else None
    return YouTubePlaylistListResponse(playlists=items, total=len(items), synced_at=synced_at)


@router.post(
    "/playlists/sync",
    response_model=YouTubePlaylistListResponse,
    status_code=status.HTTP_200_OK,
    summary="Sync playlists from YouTube and update local cache",
    description=(
        "Fetches all playlists from the connected YouTube channel via the YouTube Data API, "
        "updates the local cache, and returns the refreshed list. Requires a connected channel."
    ),
)
async def sync_playlists(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubePlaylistListResponse:
    try:
        playlists = await YouTubePlaylistService(session).sync_playlists(user.id)
    except YouTubePlaylistError as exc:
        raise HTTPException(
            status_code=_CODE_TO_STATUS.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
            detail=exc.message,
        ) from exc

    items = [YouTubePlaylistItem.from_orm(p) for p in playlists]
    synced_at = items[0].synced_at if items else None
    return YouTubePlaylistListResponse(playlists=items, total=len(items), synced_at=synced_at)


# ------------------------------------------------------------------ #
# Categories                                                           #
# ------------------------------------------------------------------ #


@router.get(
    "/categories",
    response_model=YouTubeCategoriesResponse,
    summary="Get YouTube video categories",
    description=(
        "Returns the list of assignable YouTube video categories for the US region. "
        "Results can be cached on the client side. Returns an empty list if categories "
        "cannot be fetched — this never blocks the publish flow."
    ),
)
async def get_categories(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubeCategoriesResponse:
    categories = await YouTubeCategoriesService(session).get_categories(user.id)
    return YouTubeCategoriesResponse(categories=categories)


# ------------------------------------------------------------------ #
# Publish                                                              #
# ------------------------------------------------------------------ #


@router.post(
    "/publish",
    response_model=YouTubePublishResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish a video to the connected YouTube channel",
    description=(
        "Uploads the specified video file to the user's connected YouTube channel "
        "and applies the provided metadata. The video must have been previously "
        "uploaded via POST /api/v1/videos/upload. "
        "Privacy defaults to private if not specified."
    ),
)
async def publish_video(
    body: YouTubePublishRequest,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> YouTubePublishResponse:
    try:
        return await YouTubePublishService(session).publish(user.id, body)
    except YouTubePublishError as exc:
        raise HTTPException(
            status_code=_CODE_TO_STATUS.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
            detail=exc.message,
        ) from exc
