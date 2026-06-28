import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class IntegrationAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider: str
    name: str
    external_account_id: str | None
    account_email: str | None
    status: str
    metadata: dict[str, Any] = Field(default_factory=dict, validation_alias="account_metadata")
    created_at: datetime
    updated_at: datetime


class WebhookCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    workflow_id: uuid.UUID | None = None


class WebhookCreateResponse(BaseModel):
    account: IntegrationAccountRead
    webhook_url: str
    secret: str


class StepExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_execution_id: uuid.UUID
    workflow_id: uuid.UUID
    node_id: str
    node_type: str
    integration_provider: str | None
    integration_account_id: uuid.UUID | None
    status: str
    input_data: dict[str, Any]
    output_data: dict[str, Any] | None
    error_message: str | None
    duration_ms: int | None
    created_at: datetime
    completed_at: datetime | None


class WorkflowExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_id: uuid.UUID
    status: str
    trigger_type: str
    input_data: dict[str, Any]
    error_message: str | None
    started_at: datetime
    completed_at: datetime | None
    steps: list[StepExecutionRead] = []


class WorkflowExecuteResponseV2(BaseModel):
    workflow_execution: WorkflowExecutionRead
    steps: list[StepExecutionRead]
    total_steps: int
