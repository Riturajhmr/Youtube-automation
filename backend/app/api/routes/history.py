from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger
from app.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.history import HistoryItemResponse, HistoryListResponse
from app.services.auth_service import AuthService
from app.services.history_service import HistoryService

router = APIRouter(prefix="/history", tags=["History"])
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


@router.get(
    "",
    response_model=HistoryListResponse,
    status_code=status.HTTP_200_OK,
    summary="List publication history for the authenticated user",
)
async def list_history(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    filter: str | None = Query(default=None, description="published|failed|private|public|unlisted"),
    search: str | None = Query(default=None, max_length=200),
) -> HistoryListResponse:
    return await HistoryService(session).list_publications(
        user.id, page=page, page_size=page_size, filter=filter, search=search
    )


@router.get(
    "/{publication_id}",
    response_model=HistoryItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single history item",
)
async def get_history_item(
    publication_id: uuid.UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> HistoryItemResponse:
    return await HistoryService(session).get_publication(user.id, publication_id)


@router.delete(
    "/{publication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a history entry (does not delete the YouTube video)",
)
async def delete_history_item(
    publication_id: uuid.UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await HistoryService(session).delete_publication(user.id, publication_id)
