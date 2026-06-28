import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow, WorkflowStatus
from app.schemas.workflow import WorkflowCreate, WorkflowDefinition, WorkflowUpdate

DEFAULT_DEFINITION: dict[str, Any] = {
    "nodes": [
        {
            "id": "trigger-1",
            "type": "trigger",
            "position": {"x": 250, "y": 80},
            "data": {"label": "Trigger"},
        }
    ],
    "edges": [],
    "viewport": {"x": 0, "y": 0, "zoom": 1},
}


async def list_workflows(db: AsyncSession, user_id: uuid.UUID) -> list[Workflow]:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.user_id == user_id)
        .order_by(Workflow.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_workflow(
    db: AsyncSession,
    workflow_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Workflow | None:
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def create_workflow(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: WorkflowCreate,
) -> Workflow:
    definition = (
        data.definition.model_dump() if data.definition else DEFAULT_DEFINITION.copy()
    )
    workflow = Workflow(
        user_id=user_id,
        name=data.name,
        description=data.description,
        status=data.status,
        definition=definition,
    )
    db.add(workflow)
    await db.flush()
    return workflow


async def update_workflow(
    db: AsyncSession,
    workflow: Workflow,
    data: WorkflowUpdate,
) -> Workflow:
    if data.name is not None:
        workflow.name = data.name
    if data.description is not None:
        workflow.description = data.description
    if data.status is not None:
        workflow.status = data.status
    if data.definition is not None:
        workflow.definition = data.definition.model_dump()
    await db.flush()
    return workflow


async def delete_workflow(db: AsyncSession, workflow: Workflow) -> None:
    await db.delete(workflow)
    await db.flush()
