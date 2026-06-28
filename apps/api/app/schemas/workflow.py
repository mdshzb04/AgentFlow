import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.workflow import WorkflowStatus


class WorkflowDefinition(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    viewport: dict[str, Any] | None = None


class WorkflowBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: WorkflowStatus = WorkflowStatus.DRAFT


class WorkflowCreate(WorkflowBase):
    definition: WorkflowDefinition | None = None


class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: WorkflowStatus | None = None
    definition: WorkflowDefinition | None = None


class WorkflowRead(WorkflowBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    definition: WorkflowDefinition
    n8n_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
