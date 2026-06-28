import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class N8nMetadata(BaseModel):
    source: str = "agentflow"
    n8n_workflow_id: str | None = None
    n8n_instance_id: str | None = None
    n8n_webhook_url: str | None = None
    remote_name: str | None = None
    imported_at: datetime | None = None
    exported_at: datetime | None = None
    last_synced_at: datetime | None = None
    last_triggered_at: datetime | None = None


class N8nConnectRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    base_url: str = Field(min_length=1, max_length=512)
    api_key: str = Field(min_length=1)


class N8nRemoteWorkflow(BaseModel):
    id: str
    name: str
    active: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class N8nImportRequest(BaseModel):
    account_id: uuid.UUID | None = None
    n8n_workflow_id: str | None = None
    workflow_json: dict[str, Any] | None = None
    name: str | None = None


class N8nImportResponse(BaseModel):
    workflow_id: uuid.UUID
    name: str
    nodes_imported: int
    connections_imported: int = 0
    native_count: int = 0
    n8n_native_count: int = 0
    community_count: int = 0
    community_types: list[str] = Field(default_factory=list)
    unsupported_count: int = 0
    unsupported_types: list[str] = Field(default_factory=list)
    created: bool = True
    n8n_metadata: N8nMetadata


class N8nExportResponse(BaseModel):
    workflow_id: uuid.UUID
    name: str
    n8n_workflow: dict[str, Any]
    n8n_metadata: N8nMetadata


class N8nPushRequest(BaseModel):
    account_id: uuid.UUID
    activate: bool = False


class N8nPushResponse(BaseModel):
    n8n_workflow_id: str
    name: str
    activated: bool = False
    n8n_metadata: N8nMetadata


class N8nTriggerRequest(BaseModel):
    account_id: uuid.UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class N8nTriggerResponse(BaseModel):
    success: bool
    n8n_workflow_id: str | None = None
    response: dict[str, Any] | None = None
    error: str | None = None
