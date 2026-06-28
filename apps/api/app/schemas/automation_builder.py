import uuid
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.workflow import WorkflowDefinition


class AutomationBuildRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4000)


class WebhookPlan(BaseModel):
    name: str
    direction: str = "incoming"


class AutomationPlan(BaseModel):
    name: str
    description: str | None = None
    summary: str
    trigger_type: str
    steps_summary: list[str] = Field(default_factory=list)
    workflow: WorkflowDefinition
    webhook: WebhookPlan | None = None


class AutomationBuildResponse(BaseModel):
    plan: AutomationPlan


class AutomationDeployRequest(BaseModel):
    plan: AutomationPlan
    activate: bool = True


class AutomationDeployResponse(BaseModel):
    workflow_id: uuid.UUID
    workflow_name: str
    webhook_id: uuid.UUID | None = None
    webhook_url: str | None = None
    message: str
