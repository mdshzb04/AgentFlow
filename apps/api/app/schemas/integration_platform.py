import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class IntegrationCardRead(BaseModel):
    slug: str
    name: str
    description: str
    auth_type: str
    status: str
    health_status: str
    connection_id: str | None = None
    account_email: str | None = None
    display_name: str | None = None
    last_sync_at: str | None = None
    last_error: str | None = None
    connect_url: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    metrics: dict[str, Any] = Field(default_factory=dict)


class IntegrationStatusRead(BaseModel):
    total_providers: int
    connected: int
    disconnected: int
    unhealthy: int
    providers: list[IntegrationCardRead]


class IntegrationMetricsResponse(BaseModel):
    google_sheets: dict[str, Any] = Field(default_factory=dict)
    notion: dict[str, Any] = Field(default_factory=dict)
    gmail: dict[str, Any] = Field(default_factory=dict)
    openai: dict[str, Any] = Field(default_factory=dict)
    n8n: dict[str, Any] = Field(default_factory=dict)
    webhooks: dict[str, Any] = Field(default_factory=dict)
    generated_at: str | None = None


class IntegrationConnectRequest(BaseModel):
    provider: str = Field(description="gmail | google_sheets | n8n | notion | webhooks")
    base_url: str | None = None
    api_key: str | None = None


class IntegrationConnectResponse(BaseModel):
    connection_id: str
    status: str
    message: str


class IntegrationTestRequest(BaseModel):
    connection_id: uuid.UUID


class IntegrationTestResponse(BaseModel):
    healthy: bool
    message: str
    version: str | None = None


class IntegrationConnectionDetail(BaseModel):
    id: str
    slug: str
    name: str
    display_name: str
    status: str
    health_status: str
    account_email: str | None
    external_id: str | None
    last_sync_at: str | None
    last_error: str | None
    metadata: dict[str, Any] = Field(default_factory=dict)
    has_api_key: bool = False
    api_key_masked: bool = True
    instance_url: str | None = None
    version: str | None = None
    workflows_imported: int | None = None


class N8nSettingsUpdate(BaseModel):
    base_url: str | None = None
    api_key: str | None = None


class WebhookEndpointRead(BaseModel):
    id: uuid.UUID
    name: str
    direction: str
    url: str | None = None
    target_url: str | None = None
    workflow_id: uuid.UUID | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WebhookCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    direction: str = Field(default="incoming", pattern="^(incoming|outgoing)$")
    workflow_id: uuid.UUID | None = None
    target_url: str | None = None


class WebhookCreateResponse(BaseModel):
    endpoint: WebhookEndpointRead
    secret: str | None = None
    message: str = "Save this secret now — it will not be shown again."


class WebhookLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    endpoint_id: uuid.UUID
    direction: str
    status: str
    request_payload: dict[str, Any]
    response_payload: dict[str, Any] | None
    status_code: int | None
    error_message: str | None
    retry_count: int
    created_at: datetime
    completed_at: datetime | None


class WebhookRotateResponse(BaseModel):
    secret: str
    message: str = "Secret rotated. Save this value — it will not be shown again."


class WebhookDeliverRequest(BaseModel):
    endpoint_id: uuid.UUID
    payload: dict[str, Any] = Field(default_factory=dict)
