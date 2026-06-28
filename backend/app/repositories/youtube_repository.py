from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube_account import YouTubeAccount
from app.models.youtube_credentials import YouTubeCredentials


class YouTubeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------------ #
    # Credentials                                                          #
    # ------------------------------------------------------------------ #

    async def get_credentials(self, user_id: uuid.UUID) -> YouTubeCredentials | None:
        result = await self._session.execute(
            select(YouTubeCredentials).where(YouTubeCredentials.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save_credentials(
        self,
        user_id: uuid.UUID,
        client_id: str,
        client_secret_enc: str,
    ) -> YouTubeCredentials:
        creds = YouTubeCredentials(
            id=uuid.uuid4(),
            user_id=user_id,
            client_id=client_id,
            client_secret=client_secret_enc,
        )
        self._session.add(creds)
        await self._session.flush()
        return creds

    async def update_credentials(
        self,
        creds: YouTubeCredentials,
        client_id: str | None,
        client_secret_enc: str | None,
    ) -> YouTubeCredentials:
        if client_id is not None:
            creds.client_id = client_id
        if client_secret_enc is not None:
            creds.client_secret = client_secret_enc
        await self._session.flush()
        return creds

    async def delete_credentials(self, creds: YouTubeCredentials) -> None:
        await self._session.delete(creds)
        await self._session.flush()

    # ------------------------------------------------------------------ #
    # Account                                                              #
    # ------------------------------------------------------------------ #

    async def get_account(self, user_id: uuid.UUID) -> YouTubeAccount | None:
        result = await self._session.execute(
            select(YouTubeAccount).where(YouTubeAccount.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save_account(
        self,
        user_id: uuid.UUID,
        credential_id: uuid.UUID,
        channel_id: str,
        channel_name: str,
        channel_handle: str | None,
        access_token_enc: str,
        refresh_token_enc: str | None,
        token_expiry: datetime | None,
    ) -> YouTubeAccount:
        account = YouTubeAccount(
            id=uuid.uuid4(),
            user_id=user_id,
            credential_id=credential_id,
            channel_id=channel_id,
            channel_name=channel_name,
            channel_handle=channel_handle,
            access_token=access_token_enc,
            refresh_token=refresh_token_enc,
            token_expiry=token_expiry,
        )
        self._session.add(account)
        await self._session.flush()
        return account

    async def update_account(
        self,
        account: YouTubeAccount,
        channel_id: str,
        channel_name: str,
        channel_handle: str | None,
        access_token_enc: str,
        refresh_token_enc: str | None,
        token_expiry: datetime | None,
    ) -> YouTubeAccount:
        account.channel_id = channel_id
        account.channel_name = channel_name
        account.channel_handle = channel_handle
        account.access_token = access_token_enc
        account.refresh_token = refresh_token_enc
        account.token_expiry = token_expiry
        await self._session.flush()
        return account

    async def delete_account(self, account: YouTubeAccount) -> None:
        await self._session.delete(account)
        await self._session.flush()
