from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.workflow import (
    WorkflowConfig,
    WorkflowCreate,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowUpdate,
)

logger = get_logger(__name__)


class WorkflowService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = WorkflowRepository(session)

    async def create_workflow(
        self, user_id: uuid.UUID, data: WorkflowCreate
    ) -> WorkflowResponse:
        if data.is_default:
            await self._repo.clear_default(user_id)

        workflow = await self._repo.create(
            user_id=user_id,
            name=data.name,
            description=data.description,
            workflow_type=data.workflow_type,
            config=data.config.model_dump(),
            is_default=data.is_default,
        )
        logger.info("Workflow created: id=%s user_id=%s", workflow.id, user_id)
        return WorkflowResponse.model_validate(workflow)

    async def list_workflows(self, user_id: uuid.UUID) -> WorkflowListResponse:
        items = await self._repo.list_by_user(user_id)
        return WorkflowListResponse(
            items=[WorkflowResponse.model_validate(w) for w in items],
            total=len(items),
        )

    async def get_default_workflow(self, user_id: uuid.UUID) -> WorkflowResponse:
        workflow = await self._repo.get_default(user_id)
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No default workflow set.",
            )
        return WorkflowResponse.model_validate(workflow)

    async def update_workflow(
        self, user_id: uuid.UUID, workflow_id: uuid.UUID, data: WorkflowUpdate
    ) -> WorkflowResponse:
        workflow = await self._repo.get_by_id(user_id, workflow_id)
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found.",
            )

        updates: dict[str, object] = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.description is not None:
            updates["description"] = data.description
        if data.config is not None:
            updates["config"] = data.config.model_dump()
        if data.is_default is not None:
            if data.is_default:
                await self._repo.clear_default(user_id)
            updates["is_default"] = data.is_default

        if updates:
            workflow = await self._repo.update(workflow, **updates)

        return WorkflowResponse.model_validate(workflow)

    async def delete_workflow(self, user_id: uuid.UUID, workflow_id: uuid.UUID) -> None:
        workflow = await self._repo.get_by_id(user_id, workflow_id)
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found.",
            )
        await self._repo.delete(workflow)
        logger.info("Workflow deleted: id=%s user_id=%s", workflow_id, user_id)

    async def set_default_workflow(
        self, user_id: uuid.UUID, workflow_id: uuid.UUID
    ) -> WorkflowResponse:
        workflow = await self._repo.get_by_id(user_id, workflow_id)
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found.",
            )
        await self._repo.clear_default(user_id)
        workflow = await self._repo.update(workflow, is_default=True)
        logger.info("Default workflow set: id=%s user_id=%s", workflow_id, user_id)
        return WorkflowResponse.model_validate(workflow)
