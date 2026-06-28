import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.workflow import WorkflowCreate, WorkflowRead, WorkflowUpdate
from app.services import workflow as workflow_service

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowRead])
async def list_workflows(
    current_user: CurrentUser,
    db: DbSession,
) -> list[WorkflowRead]:
    workflows = await workflow_service.list_workflows(db, current_user.id)
    return workflows


@router.post("", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: WorkflowCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkflowRead:
    workflow = await workflow_service.create_workflow(db, current_user.id, body)
    return workflow


@router.get("/{workflow_id}", response_model=WorkflowRead)
async def get_workflow(
    workflow_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkflowRead:
    workflow = await workflow_service.get_workflow(db, workflow_id, current_user.id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    return workflow


@router.patch("/{workflow_id}", response_model=WorkflowRead)
async def update_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkflowRead:
    workflow = await workflow_service.get_workflow(db, workflow_id, current_user.id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    updated = await workflow_service.update_workflow(db, workflow, body)
    return updated


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    workflow = await workflow_service.get_workflow(db, workflow_id, current_user.id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    await workflow_service.delete_workflow(db, workflow)
