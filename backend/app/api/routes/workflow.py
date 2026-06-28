from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger
from app.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowUpdate,
)
from app.services.auth_service import AuthService
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflows", tags=["Workflows"])
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
    response_model=WorkflowListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all workflows for the authenticated user",
)
async def list_workflows(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkflowListResponse:
    return await WorkflowService(session).list_workflows(user.id)


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workflow",
)
async def create_workflow(
    body: WorkflowCreate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkflowResponse:
    return await WorkflowService(session).create_workflow(user.id, body)


# NOTE: /default must be declared before /{id} to prevent FastAPI from treating
# the literal string "default" as a UUID path parameter.
@router.get(
    "/default",
    response_model=WorkflowResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the default workflow for the authenticated user",
)
async def get_default_workflow(
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkflowResponse:
    return await WorkflowService(session).get_default_workflow(user.id)


@router.post(
    "/{workflow_id}/default",
    response_model=WorkflowResponse,
    status_code=status.HTTP_200_OK,
    summary="Set a workflow as the default",
)
async def set_default_workflow(
    workflow_id: uuid.UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkflowResponse:
    return await WorkflowService(session).set_default_workflow(user.id, workflow_id)


@router.put(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a workflow",
)
async def update_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowUpdate,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> WorkflowResponse:
    return await WorkflowService(session).update_workflow(user.id, workflow_id, body)


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workflow",
)
async def delete_workflow(
    workflow_id: uuid.UUID,
    user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await WorkflowService(session).delete_workflow(user.id, workflow_id)
