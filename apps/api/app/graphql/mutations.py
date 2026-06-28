"""GraphQL mutation resolvers."""

from __future__ import annotations

import uuid

import strawberry

from app.graphql.context import GraphQLContext
from app.graphql.errors import AuthenticationError, NotFoundError, ValidationError
from app.graphql.types.crm import Company, Contact, ConvertLeadPayload, Deal, Lead, Note, Task
from app.graphql.types.inputs import (
    CompanyCreateInput,
    CompanyUpdateInput,
    ConnectIntegrationInput,
    ContactCreateInput,
    ContactUpdateInput,
    ConvertLeadInput,
    CreateWebhookInput,
    DealCreateInput,
    DealUpdateInput,
    ExecuteWorkflowInput,
    LeadCreateInput,
    LeadUpdateInput,
    NoteCreateInput,
    NoteUpdateInput,
    RunAIAgentInput,
    TaskCreateInput,
    TaskUpdateInput,
)
from app.graphql.types.platform import (
    AIAgentRunResult,
    ConnectIntegrationPayload,
    CreateWebhookPayload,
    Webhook,
    WorkflowExecution,
)
from app.models.crm import DealStage, LeadStatus, TaskPriority, TaskStatus
from app.schemas.agent import AgentRunRequest
from app.schemas.crm import (
    CompanyCreate,
    CompanyUpdate,
    ContactCreate,
    ContactUpdate,
    DealCreate,
    DealUpdate,
    LeadCreate,
    LeadUpdate,
    NoteCreate,
    NoteUpdate,
    TaskCreate,
    TaskUpdate,
)
from app.services import agent as agent_service
from app.services import crm as crm_service
from app.services import workflow_executor
from app.services.integrations.connection_service import connection_service
from app.services.integrations.health_check import health_check_service
from app.services.integrations.webhook_service import WebhookService
from app.core.config import get_settings


def _require_user(ctx: GraphQLContext):
    if ctx.user is None:
        raise AuthenticationError()


def _parse_uuid(val: strawberry.ID | None) -> uuid.UUID | None:
    if val is None:
        return None
    return uuid.UUID(str(val))


def _enum_value(val):
    return val.value if hasattr(val, "value") else val


@strawberry.type
class Mutation:
    # --- Companies ---

    @strawberry.mutation
    async def create_company(
        self, info: strawberry.Info[GraphQLContext, None], input: CompanyCreateInput
    ) -> Company:
        _require_user(info.context)
        row = await crm_service.create_company(
            info.context.db,
            info.context.user_id,
            CompanyCreate(**strawberry.asdict(input)),
        )
        return Company.from_model(row)

    @strawberry.mutation
    async def update_company(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: CompanyUpdateInput,
    ) -> Company:
        _require_user(info.context)
        row = await crm_service.get_company(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Company", str(id))
        updated = await crm_service.update_company(
            info.context.db,
            row,
            CompanyUpdate(**{k: v for k, v in strawberry.asdict(input).items() if v is not None}),
        )
        return Company.from_model(updated)

    @strawberry.mutation
    async def delete_company(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await crm_service.get_company(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Company", str(id))
        await crm_service.delete_company(info.context.db, row)
        return True

    # --- Contacts ---

    @strawberry.mutation
    async def create_contact(
        self, info: strawberry.Info[GraphQLContext, None], input: ContactCreateInput
    ) -> Contact:
        _require_user(info.context)
        data = strawberry.asdict(input)
        data["company_id"] = _parse_uuid(input.company_id)
        row = await crm_service.create_contact(
            info.context.db, info.context.user_id, ContactCreate(**data)
        )
        return Contact.from_model(row)

    @strawberry.mutation
    async def update_contact(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: ContactUpdateInput,
    ) -> Contact:
        _require_user(info.context)
        row = await crm_service.get_contact(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Contact", str(id))
        data = {k: v for k, v in strawberry.asdict(input).items() if v is not None}
        if "company_id" in data:
            data["company_id"] = _parse_uuid(input.company_id)
        updated = await crm_service.update_contact(
            info.context.db, row, ContactUpdate(**data)
        )
        return Contact.from_model(updated)

    @strawberry.mutation
    async def delete_contact(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await crm_service.get_contact(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Contact", str(id))
        await crm_service.delete_contact(info.context.db, row)
        return True

    # --- Leads ---

    @strawberry.mutation
    async def create_lead(
        self, info: strawberry.Info[GraphQLContext, None], input: LeadCreateInput
    ) -> Lead:
        _require_user(info.context)
        data = strawberry.asdict(input)
        data["company_id"] = _parse_uuid(input.company_id)
        data["contact_id"] = _parse_uuid(input.contact_id)
        data["status"] = LeadStatus(_enum_value(data["status"]))
        row = await crm_service.create_lead(
            info.context.db, info.context.user_id, LeadCreate(**data)
        )
        return Lead.from_model(row)

    @strawberry.mutation
    async def update_lead(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: LeadUpdateInput,
    ) -> Lead:
        _require_user(info.context)
        row = await crm_service.get_lead(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Lead", str(id))
        data = {k: v for k, v in strawberry.asdict(input).items() if v is not None}
        if "company_id" in data:
            data["company_id"] = _parse_uuid(input.company_id)
        if "contact_id" in data:
            data["contact_id"] = _parse_uuid(input.contact_id)
        if "status" in data:
            data["status"] = LeadStatus(_enum_value(data["status"]))
        updated = await crm_service.update_lead(info.context.db, row, LeadUpdate(**data))
        return Lead.from_model(updated)

    @strawberry.mutation
    async def delete_lead(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await crm_service.get_lead(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Lead", str(id))
        await crm_service.delete_lead(info.context.db, row)
        return True

    @strawberry.mutation(description="Convert a lead and optionally create linked records.")
    async def convert_lead(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: ConvertLeadInput | None = None,
    ) -> ConvertLeadPayload:
        _require_user(info.context)
        row = await crm_service.get_lead(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Lead", str(id))
        opts = input or ConvertLeadInput()
        result = await crm_service.convert_lead(
            info.context.db,
            info.context.user_id,
            row,
            create_contact_record=opts.create_contact_record,
            create_deal_record=opts.create_deal_record,
            deal_name=opts.deal_name,
        )
        return ConvertLeadPayload(
            lead=Lead.from_model(result["lead"]),
            contact=Contact.from_model(result["contact"]) if result["contact"] else None,
            deal=Deal.from_model(result["deal"]) if result["deal"] else None,
        )

    # --- Deals ---

    @strawberry.mutation
    async def create_deal(
        self, info: strawberry.Info[GraphQLContext, None], input: DealCreateInput
    ) -> Deal:
        _require_user(info.context)
        data = strawberry.asdict(input)
        data["company_id"] = _parse_uuid(input.company_id)
        data["contact_id"] = _parse_uuid(input.contact_id)
        data["stage"] = DealStage(_enum_value(data["stage"]))
        row = await crm_service.create_deal(
            info.context.db, info.context.user_id, DealCreate(**data)
        )
        return Deal.from_model(row)

    @strawberry.mutation
    async def update_deal(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: DealUpdateInput,
    ) -> Deal:
        _require_user(info.context)
        row = await crm_service.get_deal(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Deal", str(id))
        data = {k: v for k, v in strawberry.asdict(input).items() if v is not None}
        if "company_id" in data:
            data["company_id"] = _parse_uuid(input.company_id)
        if "contact_id" in data:
            data["contact_id"] = _parse_uuid(input.contact_id)
        if "stage" in data:
            data["stage"] = DealStage(_enum_value(data["stage"]))
        updated = await crm_service.update_deal(info.context.db, row, DealUpdate(**data))
        return Deal.from_model(updated)

    @strawberry.mutation
    async def delete_deal(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await crm_service.get_deal(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Deal", str(id))
        await crm_service.delete_deal(info.context.db, row)
        return True

    # --- Tasks ---

    @strawberry.mutation
    async def create_task(
        self, info: strawberry.Info[GraphQLContext, None], input: TaskCreateInput
    ) -> Task:
        _require_user(info.context)
        data = strawberry.asdict(input)
        data["related_id"] = _parse_uuid(input.related_id)
        data["status"] = TaskStatus(_enum_value(data["status"]))
        data["priority"] = TaskPriority(_enum_value(data["priority"]))
        row = await crm_service.create_task(
            info.context.db, info.context.user_id, TaskCreate(**data)
        )
        return Task.from_model(row)

    @strawberry.mutation
    async def update_task(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: TaskUpdateInput,
    ) -> Task:
        _require_user(info.context)
        row = await crm_service.get_task(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Task", str(id))
        data = {k: v for k, v in strawberry.asdict(input).items() if v is not None}
        if "related_id" in data:
            data["related_id"] = _parse_uuid(input.related_id)
        if "status" in data:
            data["status"] = TaskStatus(_enum_value(data["status"]))
        if "priority" in data:
            data["priority"] = TaskPriority(_enum_value(data["priority"]))
        updated = await crm_service.update_task(info.context.db, row, TaskUpdate(**data))
        return Task.from_model(updated)

    @strawberry.mutation
    async def delete_task(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await crm_service.get_task(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Task", str(id))
        await crm_service.delete_task(info.context.db, row)
        return True

    @strawberry.mutation
    async def complete_task(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Task:
        _require_user(info.context)
        row = await crm_service.get_task(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Task", str(id))
        updated = await crm_service.complete_task(info.context.db, row)
        return Task.from_model(updated)

    # --- Notes ---

    @strawberry.mutation
    async def create_note(
        self, info: strawberry.Info[GraphQLContext, None], input: NoteCreateInput
    ) -> Note:
        _require_user(info.context)
        if not input.body.strip():
            raise ValidationError("Note body is required", field="body")
        row = await crm_service.create_note(
            info.context.db,
            info.context.user_id,
            NoteCreate(
                body=input.body,
                related_type=input.related_type,
                related_id=_parse_uuid(input.related_id),  # type: ignore[arg-type]
            ),
        )
        return Note.from_model(row)

    @strawberry.mutation
    async def update_note(
        self,
        info: strawberry.Info[GraphQLContext, None],
        id: strawberry.ID,
        input: NoteUpdateInput,
    ) -> Note:
        _require_user(info.context)
        row = await crm_service.get_note(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Note", str(id))
        data = {k: v for k, v in strawberry.asdict(input).items() if v is not None}
        updated = await crm_service.update_note(info.context.db, row, NoteUpdate(**data))
        return Note.from_model(updated)

    @strawberry.mutation
    async def delete_note(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await crm_service.get_note(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Note", str(id))
        await crm_service.delete_note(info.context.db, row)
        return True

    # --- Platform ---

    @strawberry.mutation
    async def run_ai_agent(
        self, info: strawberry.Info[GraphQLContext, None], input: RunAIAgentInput
    ) -> AIAgentRunResult:
        _require_user(info.context)
        payload = strawberry.asdict(input)
        request = AgentRunRequest(
            template=payload.get("template"),
            provider=payload.get("provider"),
            model=payload.get("model"),
            system_prompt=payload.get("system_prompt"),
            user_prompt=payload.get("user_prompt"),
            variables=payload.get("variables") or {},
            input=payload.get("input") or {},
        )
        execution = await agent_service.run_agent(info.context.db, info.context.user_id, request)
        return AIAgentRunResult(
            execution_id=strawberry.ID(str(execution.id)),
            status=execution.status.value,
            output=execution.output_data,
            provider=execution.provider,
            model=execution.model,
        )

    @strawberry.mutation
    async def execute_workflow(
        self, info: strawberry.Info[GraphQLContext, None], input: ExecuteWorkflowInput
    ) -> WorkflowExecution:
        _require_user(info.context)
        wf_exec, _steps = await workflow_executor.execute_workflow(
            info.context.db,
            info.context.user_id,
            uuid.UUID(str(input.workflow_id)),
            input.input or {},
        )
        return WorkflowExecution.from_model(wf_exec)

    @strawberry.mutation
    async def connect_integration(
        self, info: strawberry.Info[GraphQLContext, None], input: ConnectIntegrationInput
    ) -> ConnectIntegrationPayload:
        _require_user(info.context)
        settings = get_settings()
        if input.provider == "n8n":
            if not input.base_url or not input.api_key:
                raise ValidationError("base_url and api_key are required for n8n")
            connection = await connection_service.create_n8n_connection(
                info.context.db,
                info.context.user_id,
                base_url=input.base_url,
                api_key=input.api_key,
            )
            integration = await connection_service.get_integration_by_slug(info.context.db, "n8n")
            if integration:
                result = await health_check_service.test_connection(
                    info.context.db, connection, integration
                )
                await connection_service.record_health(
                    info.context.db,
                    connection,
                    healthy=result["healthy"],
                    message=result.get("message"),
                    version=result.get("version"),
                )
            return ConnectIntegrationPayload(
                connection_id=strawberry.ID(str(connection.id)),
                status="connected",
                message="n8n connected successfully",
            )
        if input.provider == "notion":
            api_key = (input.api_key or "").strip()
            if not api_key:
                raise ValidationError("api_key is required to connect Notion")
            connection = await connection_service.create_notion_connection(
                info.context.db, info.context.user_id, api_key=api_key
            )
            return ConnectIntegrationPayload(
                connection_id=strawberry.ID(str(connection.id)),
                status="connected",
                message="Notion connected successfully",
            )
        raise ValidationError(f"Unsupported provider: {input.provider}")

    @strawberry.mutation
    async def disconnect_integration(
        self, info: strawberry.Info[GraphQLContext, None], connection_id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        row = await connection_service.get_connection(
            info.context.db, uuid.UUID(str(connection_id)), info.context.user_id
        )
        if not row:
            raise NotFoundError("Integration connection", str(connection_id))
        connection, _integration = row
        await connection_service.disconnect(info.context.db, connection)
        return True

    @strawberry.mutation
    async def create_webhook(
        self, info: strawberry.Info[GraphQLContext, None], input: CreateWebhookInput
    ) -> CreateWebhookPayload:
        _require_user(info.context)
        service = WebhookService()
        endpoint, secret = await service.create_incoming(
            info.context.db,
            info.context.user_id,
            name=input.name,
            workflow_id=_parse_uuid(input.workflow_id),
        )
        return CreateWebhookPayload(webhook=Webhook.from_model(endpoint), secret=secret)

    @strawberry.mutation
    async def delete_webhook(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> bool:
        _require_user(info.context)
        service = WebhookService()
        endpoint = await service.get_endpoint(
            info.context.db, uuid.UUID(str(id)), info.context.user_id
        )
        if not endpoint:
            raise NotFoundError("Webhook", str(id))
        await service.delete_endpoint(info.context.db, endpoint)
        return True
