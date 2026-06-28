from __future__ import annotations

import secrets
import uuid
from datetime import timedelta, timezone, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import YouTubeConnectionError, YouTubeCredentialError
from app.core.logging import get_logger
from app.core.security import create_access_token, decode_access_token, decrypt_value, encrypt_value
from app.repositories.channel_session_repository import ChannelSessionRepository
from app.repositories.youtube_repository import YouTubeRepository
from app.schemas.youtube import (
    YouTubeAccountResponse,
    YouTubeChannelOption,
    YouTubeCredentialsResponse,
    YouTubeCredentialsSave,
    YouTubeCredentialsUpdate,
    YouTubePendingChannelsResponse,
)

logger = get_logger(__name__)

_YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube",
]

_CHANNEL_SESSION_TTL_MINUTES = 15


def _build_client_config(client_id: str, client_secret: str, redirect_uri: str) -> dict:
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uris": [redirect_uri],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def _generate_code_verifier() -> str:
    """Generate a RFC 7636 PKCE code verifier (32 random bytes → 43-char URL-safe string)."""
    return secrets.token_urlsafe(32)


def _extract_channel_info(item: dict) -> dict:
    snippet = item.get("snippet", {})
    thumbnails = snippet.get("thumbnails", {})
    thumbnail_url = (
        thumbnails.get("medium", {}).get("url")
        or thumbnails.get("default", {}).get("url")
    )
    return {
        "channel_id": item["id"],
        "channel_name": snippet.get("title", ""),
        "channel_handle": snippet.get("customUrl"),
        "thumbnail_url": thumbnail_url,
    }


class YouTubeService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._repo = YouTubeRepository(session)
        self._session_repo = ChannelSessionRepository(session)
        self._settings = settings or get_settings()

    # ------------------------------------------------------------------ #
    # Credentials                                                          #
    # ------------------------------------------------------------------ #

    async def save_credentials(
        self, user_id: uuid.UUID, data: YouTubeCredentialsSave
    ) -> YouTubeCredentialsResponse:
        existing = await self._repo.get_credentials(user_id)
        if existing:
            raise YouTubeCredentialError(
                "Credentials already exist. Use PUT to update them.",
                code="CREDENTIALS_ALREADY_EXIST",
            )
        enc_secret = encrypt_value(data.client_secret)
        creds = await self._repo.save_credentials(user_id, data.client_id, enc_secret)
        return YouTubeCredentialsResponse.from_orm(creds)

    async def get_credentials(self, user_id: uuid.UUID) -> YouTubeCredentialsResponse | None:
        creds = await self._repo.get_credentials(user_id)
        if not creds:
            return None
        return YouTubeCredentialsResponse.from_orm(creds)

    async def update_credentials(
        self, user_id: uuid.UUID, data: YouTubeCredentialsUpdate
    ) -> YouTubeCredentialsResponse:
        creds = await self._repo.get_credentials(user_id)
        if not creds:
            raise YouTubeCredentialError(
                "No credentials found. Use POST to create them first.",
                code="CREDENTIALS_NOT_FOUND",
            )
        enc_secret = encrypt_value(data.client_secret) if data.client_secret else None
        creds = await self._repo.update_credentials(creds, data.client_id, enc_secret)
        return YouTubeCredentialsResponse.from_orm(creds)

    async def delete_credentials(self, user_id: uuid.UUID) -> None:
        creds = await self._repo.get_credentials(user_id)
        if not creds:
            raise YouTubeCredentialError(
                "No credentials found.", code="CREDENTIALS_NOT_FOUND"
            )
        account = await self._repo.get_account(user_id)
        if account:
            await self._repo.delete_account(account)
        await self._repo.delete_credentials(creds)

    # ------------------------------------------------------------------ #
    # OAuth flow                                                           #
    # ------------------------------------------------------------------ #

    async def get_connect_url(self, user_id: uuid.UUID) -> str:
        creds = await self._repo.get_credentials(user_id)
        if not creds:
            raise YouTubeCredentialError(
                "Save your Client ID and Client Secret before connecting.",
                code="CREDENTIALS_REQUIRED",
            )
        client_secret = decrypt_value(creds.client_secret)

        try:
            from google_auth_oauthlib.flow import Flow  # type: ignore[import-untyped]
        except ImportError as exc:
            raise YouTubeConnectionError(
                "google-auth-oauthlib is not installed.", code="MISSING_DEPENDENCY"
            ) from exc

        # Generate PKCE S256 verifier; embed in the signed state JWT so it survives
        # the round-trip to Google and back without server-side session storage.
        code_verifier = _generate_code_verifier()

        flow = Flow.from_client_config(
            _build_client_config(creds.client_id, client_secret, self._settings.YOUTUBE_REDIRECT_URI),
            scopes=_YOUTUBE_SCOPES,
            redirect_uri=self._settings.YOUTUBE_REDIRECT_URI,
            code_verifier=code_verifier,
        )

        # Encode user identity + PKCE verifier in the state parameter
        state_payload = {
            "sub": str(user_id),
            "type": "youtube_oauth",
            "cv": code_verifier,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        }
        state_jwt = create_access_token(state_payload)

        auth_url, _ = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            state=state_jwt,
        )
        return auth_url

    async def handle_callback(self, code: str, state: str) -> YouTubeAccountResponse | str:
        """Exchange OAuth code for tokens and either connect the channel immediately
        (single channel) or return a session_id for channel selection (multiple channels).

        Returns YouTubeAccountResponse when auto-connected, str session_id otherwise.
        """
        # Validate state JWT and recover user_id + PKCE code_verifier
        try:
            payload = decode_access_token(state)
        except Exception as exc:
            logger.error("YouTube OAuth callback: invalid state JWT", exc_info=True)
            raise YouTubeConnectionError(
                "Invalid OAuth state. Please try connecting again.",
                code="INVALID_STATE",
            ) from exc

        if payload.get("type") != "youtube_oauth":
            logger.error("YouTube OAuth callback: unexpected state type %r", payload.get("type"))
            raise YouTubeConnectionError(
                "Invalid OAuth state type.", code="INVALID_STATE"
            )

        user_id = uuid.UUID(payload["sub"])
        code_verifier: str | None = payload.get("cv")

        logger.info("YouTube OAuth callback: state validated, user_id=%s", user_id)

        creds = await self._repo.get_credentials(user_id)
        if not creds:
            logger.error("YouTube OAuth callback: no credentials found for user_id=%s", user_id)
            raise YouTubeConnectionError(
                "Credentials not found for this user.", code="CREDENTIALS_MISSING"
            )

        client_secret = decrypt_value(creds.client_secret)

        try:
            from google_auth_oauthlib.flow import Flow  # type: ignore[import-untyped]
            from googleapiclient.discovery import build  # type: ignore[import-untyped]
        except ImportError as exc:
            logger.error("YouTube OAuth callback: Google client libraries not installed", exc_info=True)
            raise YouTubeConnectionError(
                "Google client libraries are not installed.", code="MISSING_DEPENDENCY"
            ) from exc

        # Step 1: exchange authorization code for tokens
        try:
            flow = Flow.from_client_config(
                _build_client_config(
                    creds.client_id, client_secret, self._settings.YOUTUBE_REDIRECT_URI
                ),
                scopes=_YOUTUBE_SCOPES,
                redirect_uri=self._settings.YOUTUBE_REDIRECT_URI,
                code_verifier=code_verifier,
            )
            flow.fetch_token(code=code)
            google_creds = flow.credentials
        except Exception as exc:
            logger.error(
                "YouTube OAuth callback: token exchange failed for user_id=%s — %s",
                user_id, exc,
                exc_info=True,
            )
            raise YouTubeConnectionError(
                f"Failed to exchange authorization code: {exc}",
                code="TOKEN_EXCHANGE_FAILED",
            ) from exc

        logger.info(
            "YouTube OAuth callback: token exchange succeeded for user_id=%s, "
            "has_access_token=%s, has_refresh_token=%s",
            user_id,
            bool(google_creds.token),
            bool(google_creds.refresh_token),
        )

        # Step 2: fetch all channels on this Google account
        logger.info("YouTube OAuth callback: calling channels.list for user_id=%s", user_id)
        try:
            youtube = build("youtube", "v3", credentials=google_creds, cache_discovery=False)
            response = youtube.channels().list(part="snippet", mine=True).execute()
            items = response.get("items", [])
            logger.info(
                "YouTube OAuth callback: channels.list returned %d item(s) for user_id=%s",
                len(items), user_id,
            )
            if not items:
                logger.error(
                    "YouTube OAuth callback: no YouTube channel on this Google account, user_id=%s",
                    user_id,
                )
                raise YouTubeConnectionError(
                    "No YouTube channel found for this account.",
                    code="NO_CHANNEL_FOUND",
                )
        except YouTubeConnectionError:
            raise
        except Exception as exc:
            logger.error(
                "YouTube OAuth callback: channels.list failed for user_id=%s — %s",
                user_id, exc,
                exc_info=True,
            )
            raise YouTubeConnectionError(
                f"Failed to fetch channel information: {exc}",
                code="CHANNEL_FETCH_FAILED",
            ) from exc

        token_expiry = google_creds.expiry
        if token_expiry is not None and token_expiry.tzinfo is None:
            token_expiry = token_expiry.replace(tzinfo=timezone.utc)

        access_token_enc = encrypt_value(google_creds.token)
        refresh_token_enc = (
            encrypt_value(google_creds.refresh_token) if google_creds.refresh_token else None
        )

        # Step 3a: multiple channels — store session for user to pick one
        if len(items) > 1:
            available_channels = [_extract_channel_info(item) for item in items]
            logger.info(
                "YouTube OAuth callback: multiple channels found (%d), creating selection session for user_id=%s",
                len(items), user_id,
            )
            session_obj = await self._session_repo.create(
                user_id=user_id,
                access_token_enc=access_token_enc,
                refresh_token_enc=refresh_token_enc,
                token_expiry=token_expiry,
                available_channels=available_channels,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=_CHANNEL_SESSION_TTL_MINUTES),
            )
            return str(session_obj.id)

        # Step 3b: single channel — auto-connect immediately
        channel_info = _extract_channel_info(items[0])
        channel_id = channel_info["channel_id"]
        channel_name = channel_info["channel_name"]
        channel_handle = channel_info["channel_handle"]

        logger.info(
            "YouTube OAuth callback: single channel, auto-connecting — "
            "channel_id=%s, channel_name=%r",
            channel_id, channel_name,
        )
        return await self._save_account(
            user_id=user_id,
            credential_id=creds.id,
            channel_id=channel_id,
            channel_name=channel_name,
            channel_handle=channel_handle,
            access_token_enc=access_token_enc,
            refresh_token_enc=refresh_token_enc,
            token_expiry=token_expiry,
        )

    async def get_pending_channels(
        self, user_id: uuid.UUID, session_id: str
    ) -> YouTubePendingChannelsResponse:
        """Return the list of available channels stored in the temporary selection session."""
        session_obj = await self._load_valid_session(user_id, session_id)
        channels = [YouTubeChannelOption(**ch) for ch in session_obj.available_channels]
        return YouTubePendingChannelsResponse(session_id=session_id, channels=channels)

    async def complete_channel_selection(
        self, user_id: uuid.UUID, session_id: str, channel_id: str
    ) -> YouTubeAccountResponse:
        """Finalize channel connection by picking one channel from a pending session."""
        session_obj = await self._load_valid_session(user_id, session_id)

        # Validate the chosen channel is in the session
        match = next(
            (ch for ch in session_obj.available_channels if ch["channel_id"] == channel_id),
            None,
        )
        if not match:
            raise YouTubeConnectionError(
                "Selected channel not found in this session.", code="CHANNEL_NOT_FOUND"
            )

        creds = await self._repo.get_credentials(user_id)
        if not creds:
            raise YouTubeConnectionError(
                "Credentials not found for this user.", code="CREDENTIALS_MISSING"
            )

        account = await self._save_account(
            user_id=user_id,
            credential_id=creds.id,
            channel_id=match["channel_id"],
            channel_name=match["channel_name"],
            channel_handle=match.get("channel_handle"),
            access_token_enc=session_obj.access_token_enc,
            refresh_token_enc=session_obj.refresh_token_enc,
            token_expiry=session_obj.token_expiry,
        )

        await self._session_repo.delete(session_obj)
        logger.info(
            "Channel selection complete: user_id=%s, channel_id=%s", user_id, channel_id
        )
        return account

    # ------------------------------------------------------------------ #
    # Account                                                              #
    # ------------------------------------------------------------------ #

    async def get_account(self, user_id: uuid.UUID) -> YouTubeAccountResponse | None:
        logger.debug("youtube_accounts lookup: user_id=%s", user_id)
        account = await self._repo.get_account(user_id)
        if not account:
            logger.warning("youtube_accounts lookup: no row found for user_id=%s", user_id)
            return None
        logger.debug(
            "youtube_accounts lookup: found account_id=%s, channel_id=%s",
            account.id, account.channel_id,
        )
        return YouTubeAccountResponse.from_orm(account)

    async def disconnect(self, user_id: uuid.UUID) -> None:
        account = await self._repo.get_account(user_id)
        if not account:
            raise YouTubeCredentialError(
                "No connected YouTube channel found.", code="NOT_CONNECTED"
            )
        await self._repo.delete_account(account)

    # ------------------------------------------------------------------ #
    # Private helpers                                                      #
    # ------------------------------------------------------------------ #

    async def _load_valid_session(self, user_id: uuid.UUID, session_id: str):
        try:
            sid = uuid.UUID(session_id)
        except ValueError as exc:
            raise YouTubeConnectionError(
                "Invalid session ID.", code="SESSION_INVALID"
            ) from exc

        session_obj = await self._session_repo.get(sid)
        if not session_obj:
            raise YouTubeConnectionError(
                "Session not found or expired. Please reconnect your YouTube channel.",
                code="SESSION_EXPIRED",
            )
        if session_obj.user_id != user_id:
            raise YouTubeConnectionError(
                "Session not found. Please reconnect your YouTube channel.",
                code="SESSION_INVALID",
            )
        return session_obj

    async def _save_account(
        self,
        user_id: uuid.UUID,
        credential_id: uuid.UUID,
        channel_id: str,
        channel_name: str,
        channel_handle: str | None,
        access_token_enc: str,
        refresh_token_enc: str | None,
        token_expiry: datetime | None,
    ) -> YouTubeAccountResponse:
        existing_account = await self._repo.get_account(user_id)
        if existing_account:
            account = await self._repo.update_account(
                existing_account,
                channel_id=channel_id,
                channel_name=channel_name,
                channel_handle=channel_handle,
                access_token_enc=access_token_enc,
                refresh_token_enc=refresh_token_enc,
                token_expiry=token_expiry,
            )
            logger.info(
                "YouTube account updated: account_id=%s, channel_id=%s", account.id, channel_id
            )
        else:
            account = await self._repo.save_account(
                user_id=user_id,
                credential_id=credential_id,
                channel_id=channel_id,
                channel_name=channel_name,
                channel_handle=channel_handle,
                access_token_enc=access_token_enc,
                refresh_token_enc=refresh_token_enc,
                token_expiry=token_expiry,
            )
            logger.info(
                "YouTube account created: account_id=%s, channel_id=%s", account.id, channel_id
            )
        return YouTubeAccountResponse.from_orm(account)
