from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow


class WorkflowRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        name: str,
        description: str | None,
        workflow_type: str,
        config: dict,
        is_default: bool,
    ) -> Workflow:
        workflow = Workflow(
            id=uuid.uuid4(),
            user_id=user_id,
            name=name,
            description=description,
            workflow_type=workflow_type,
            config=config,
            is_default=is_default,
        )
        self._session.add(workflow)
        await self._session.flush()
        return workflow

    async def get_by_id(self, user_id: uuid.UUID, workflow_id: uuid.UUID) -> Workflow | None:
        result = await self._session.execute(
            select(Workflow).where(
                Workflow.id == workflow_id,
                Workflow.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[Workflow]:
        result = await self._session.execute(
            select(Workflow)
            .where(Workflow.user_id == user_id)
            .order_by(Workflow.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_default(self, user_id: uuid.UUID) -> Workflow | None:
        result = await self._session.execute(
            select(Workflow).where(
                Workflow.user_id == user_id,
                Workflow.is_default.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def update(self, workflow: Workflow, **kwargs: object) -> Workflow:
        for key, value in kwargs.items():
            setattr(workflow, key, value)
        await self._session.flush()
        return workflow

    async def delete(self, workflow: Workflow) -> None:
        await self._session.delete(workflow)
        await self._session.flush()

    async def clear_default(self, user_id: uuid.UUID) -> None:
        await self._session.execute(
            update(Workflow)
            .where(Workflow.user_id == user_id, Workflow.is_default.is_(True))
            .values(is_default=False)
        )
        await self._session.flush()
