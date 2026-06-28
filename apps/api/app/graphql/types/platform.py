"""Platform GraphQL types: workflows, agents, integrations, webhooks, analytics."""

from __future__ import annotations

from typing import Any

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.types.crm import Company, Contact, Deal, Lead, Note, Task
from app.models.agent import AgentExecution as AgentExecutionModel
from app.models.integration import WorkflowExecution as WorkflowExecutionModel
from app.models.integration_platform import IntegrationConnection, WebhookEndpoint
from app.models.workflow import Workflow as WorkflowModel


@strawberry.type(description="Workflow automation definition.")
class Workflow:
    id: strawberry.ID
    name: str
    description: str | None
    status: str
    definition: JSON
    created_at: str
    updated_at: str
    _model: strawberry.Private[WorkflowModel]

    @classmethod
    def from_model(cls, model: WorkflowModel) -> Workflow:
        return cls(
            _model=model,
            id=strawberry.ID(str(model.id)),
            name=model.name,
            description=model.description,
            status=model.status.value if hasattr(model.status, "value") else str(model.status),
            definition=model.definition,
            created_at=model.created_at.isoformat(),
            updated_at=model.updated_at.isoformat(),
        )

    @strawberry.field(description="Execution history for this workflow.")
    async def executions(self, info: Info[GraphQLContext, None]) -> list[WorkflowExecution]:
        ctx = info.context
        rows = await ctx.loaders.executions_by_workflow.load(self._model.id)  # type: ignore[union-attr]
        return [WorkflowExecution.from_model(row) for row in rows]


@strawberry.type(description="A single workflow run.")
class WorkflowExecution:
    id: strawberry.ID
    workflow_id: strawberry.ID | None
    status: str
    input_data: JSON | None
    output_data: JSON | None
    error_message: str | None
    started_at: str | None
    completed_at: str | None

    @classmethod
    def from_model(cls, model: WorkflowExecutionModel) -> WorkflowExecution:
        return cls(
            id=strawberry.ID(str(model.id)),
            workflow_id=strawberry.ID(str(model.workflow_id)) if model.workflow_id else None,
            status=model.status.value if hasattr(model.status, "value") else str(model.status),
            input_data=model.input_data,
            output_data=model.output_data,
            error_message=model.error_message,
            started_at=model.started_at.isoformat() if model.started_at else None,
            completed_at=model.completed_at.isoformat() if model.completed_at else None,
        )


@strawberry.type(description="AI agent template or execution.")
class AIAgent:
    id: strawberry.ID
    slug: str
    name: str
    description: str | None
    category: str
    is_builtin: bool
    default_provider: str
    default_model: str | None

    @classmethod
    def from_template(cls, template: dict[str, Any]) -> AIAgent:
        return cls(
            id=strawberry.ID(str(template["id"])),
            slug=template["slug"],
            name=template["name"],
            description=template.get("description"),
            category=str(template.get("category", "custom")),
            is_builtin=bool(template.get("is_builtin", False)),
            default_provider=str(template.get("default_provider", "openai")),
            default_model=template.get("default_model"),
        )


@strawberry.type(description="Result of running an AI agent.")
class AIAgentRunResult:
    execution_id: strawberry.ID
    status: str
    output: JSON | None
    provider: str
    model: str


@strawberry.type(description="Connected integration provider card.")
class Integration:
    slug: str
    name: str
    description: str
    auth_type: str
    status: str
    health_status: str
    connection_id: strawberry.ID | None
    account_email: str | None
    display_name: str | None
    settings: JSON

    @classmethod
    def from_card(cls, card: dict[str, Any]) -> Integration:
        return cls(
            slug=card["slug"],
            name=card["name"],
            description=card["description"],
            auth_type=card["auth_type"],
            status=card["status"],
            health_status=card["health_status"],
            connection_id=(
                strawberry.ID(str(card["connection_id"])) if card.get("connection_id") else None
            ),
            account_email=card.get("account_email"),
            display_name=card.get("display_name"),
            settings=card.get("settings") or {},
        )


@strawberry.type(description="Webhook endpoint configuration.")
class Webhook:
    id: strawberry.ID
    name: str
    direction: str
    url_token: str
    is_active: bool
    workflow_id: strawberry.ID | None
    created_at: str

    @classmethod
    def from_model(cls, model: WebhookEndpoint) -> Webhook:
        return cls(
            id=strawberry.ID(str(model.id)),
            name=model.name,
            direction=model.direction.value if hasattr(model.direction, "value") else str(model.direction),
            url_token=model.url_token,
            is_active=model.is_active,
            workflow_id=strawberry.ID(str(model.workflow_id)) if model.workflow_id else None,
            created_at=model.created_at.isoformat(),
        )


@strawberry.type(description="Dashboard analytics summary.")
class DashboardMetrics:
    summary: JSON
    workflow_runs_timeseries: JSON
    token_usage_timeseries: JSON
    ai_requests_timeseries: JSON
    lead_funnel: JSON
    recent_failures: JSON

    @classmethod
    def from_overview(cls, overview: Any) -> DashboardMetrics:
        return cls(
            summary=overview.summary.model_dump(),
            workflow_runs_timeseries=[p.model_dump() for p in overview.workflow_runs_timeseries],
            token_usage_timeseries=[p.model_dump() for p in overview.token_usage_timeseries],
            ai_requests_timeseries=[p.model_dump() for p in overview.ai_requests_timeseries],
            lead_funnel=[p.model_dump() for p in overview.lead_funnel],
            recent_failures=[p.model_dump() for p in overview.recent_failures],
        )


@strawberry.type(description="Integration connect mutation result.")
class ConnectIntegrationPayload:
    connection_id: strawberry.ID | None
    status: str
    message: str
    connect_url: str | None = None


@strawberry.type(description="Webhook creation result including one-time secret.")
class CreateWebhookPayload:
    webhook: Webhook
    secret: str | None
