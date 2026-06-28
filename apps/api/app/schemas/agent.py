import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.agent import ExecutionStatus, OutputMode, TemplateCategory


class PromptTemplateRead(BaseModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    category: str
    system_prompt: str
    user_prompt_template: str
    output_mode: str
    json_schema: dict[str, Any] | None = None
    tools: list[dict[str, Any]] | None = None
    default_provider: str
    default_model: str | None = None
    is_builtin: bool = False


class PromptTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=128)
    description: str | None = None
    category: TemplateCategory = TemplateCategory.CUSTOM
    system_prompt: str = Field(min_length=1)
    user_prompt_template: str = Field(min_length=1)
    output_mode: OutputMode = OutputMode.TEXT
    json_schema: dict[str, Any] | None = None
    tools: list[dict[str, Any]] | None = None
    default_provider: str = "openai"
    default_model: str | None = None


class AgentRunRequest(BaseModel):
    provider: Literal["openai", "anthropic"] | None = None
    model: str | None = None
    template: str | None = None
    system_prompt: str | None = None
    user_prompt: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    input: dict[str, Any] = Field(default_factory=dict)
    output_mode: OutputMode | str | None = None
    json_schema: dict[str, Any] | None = None
    tools: list[dict[str, Any]] | None = None
    workflow_id: uuid.UUID | None = None
    node_id: str | None = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4096, ge=1, le=128000)


class WorkflowExecuteRequest(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)


class ExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    workflow_id: uuid.UUID | None
    node_id: str | None
    template_slug: str | None
    provider: str
    model: str
    status: ExecutionStatus
    input_data: dict[str, Any]
    output_data: dict[str, Any] | None
    tool_calls: list[dict[str, Any]] | None
    steps: list[dict[str, Any]] | None
    usage: dict[str, Any] | None
    error_message: str | None
    duration_ms: int | None
    created_at: datetime
    completed_at: datetime | None


class WorkflowExecuteResponse(BaseModel):
    workflow_id: uuid.UUID
    executions: list[ExecutionRead]
    total_steps: int
