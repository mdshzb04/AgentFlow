"""GraphQL query resolvers."""

from __future__ import annotations

import uuid
from typing import TypeVar

import strawberry
from sqlalchemy import func, select

from app.graphql.context import GraphQLContext
from app.graphql.errors import AuthenticationError, NotFoundError
from app.graphql.filters import apply_crm_filters
from app.graphql.pagination import (
    Connection,
    CrmListFilter,
    PaginationInput,
    build_page_info,
)
from app.graphql.types.crm import (
    Company,
    Contact,
    CrmRecordLabels,
    CrmSearchResult,
    Deal,
    Lead,
    Note,
    RecordLabel,
    Task,
)
from app.graphql.types.platform import (
    AIAgent,
    DashboardMetrics,
    Integration,
    Webhook,
    Workflow,
)
from app.models.crm import Company as CompanyModel
from app.models.crm import Contact as ContactModel
from app.models.crm import Deal as DealModel
from app.models.crm import Lead as LeadModel
from app.models.crm import Note as NoteModel
from app.models.crm import Task as TaskModel
from app.services import agent as agent_service
from app.services import analytics as analytics_service
from app.services import crm as crm_service
from app.services import workflow as workflow_service
from app.services.integrations.integration_service import integration_service
from app.services.integrations.webhook_service import WebhookService

T = TypeVar("T")


def _require_user(ctx: GraphQLContext):
    if ctx.user is None:
        raise AuthenticationError()


async def _paginated_list(
    ctx: GraphQLContext,
    model,
    gql_type: type[T],
    filters: CrmListFilter | None,
    pagination: PaginationInput,
    *,
    search_fields: list | None = None,
    status_field=None,
    extra_where=None,
) -> Connection[T]:
    _require_user(ctx)
    limit = max(1, min(pagination.limit, 100))
    offset = max(0, pagination.offset)

    base = select(model).where(model.user_id == ctx.user_id)
    if extra_where is not None:
        base = base.where(extra_where)
    filtered = apply_crm_filters(base, model, filters, search_fields=search_fields, status_field=status_field)

    count_stmt = select(func.count()).select_from(filtered.subquery())
    total = (await ctx.db.execute(count_stmt)).scalar_one()

    rows = (
        await ctx.db.execute(filtered.limit(limit).offset(offset))
    ).scalars().all()

    return Connection(
        nodes=[gql_type.from_model(row) for row in rows],
        page_info=build_page_info(total, pagination),
    )


@strawberry.type
class Query:
    @strawberry.field(description="Paginated list of companies.")
    async def companies(
        self,
        info: strawberry.Info[GraphQLContext, None],
        filters: CrmListFilter | None = None,
        pagination: PaginationInput | None = None,
    ) -> Connection[Company]:
        return await _paginated_list(
            info.context,
            CompanyModel,
            Company,
            filters,
            pagination or PaginationInput(),
            search_fields=[CompanyModel.name, CompanyModel.domain, CompanyModel.industry],
        )

    @strawberry.field
    async def company(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Company:
        _require_user(info.context)
        row = await crm_service.get_company(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Company", str(id))
        return Company.from_model(row)

    @strawberry.field
    async def contacts(
        self,
        info: strawberry.Info[GraphQLContext, None],
        filters: CrmListFilter | None = None,
        pagination: PaginationInput | None = None,
    ) -> Connection[Contact]:
        return await _paginated_list(
            info.context,
            ContactModel,
            Contact,
            filters,
            pagination or PaginationInput(),
            search_fields=[
                ContactModel.first_name,
                ContactModel.last_name,
                ContactModel.email,
            ],
            status_field=ContactModel.status,
        )

    @strawberry.field
    async def contact(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Contact:
        _require_user(info.context)
        row = await crm_service.get_contact(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Contact", str(id))
        return Contact.from_model(row)

    @strawberry.field
    async def leads(
        self,
        info: strawberry.Info[GraphQLContext, None],
        filters: CrmListFilter | None = None,
        pagination: PaginationInput | None = None,
    ) -> Connection[Lead]:
        return await _paginated_list(
            info.context,
            LeadModel,
            Lead,
            filters,
            pagination or PaginationInput(),
            search_fields=[LeadModel.title, LeadModel.email, LeadModel.source],
            status_field=LeadModel.status,
        )

    @strawberry.field
    async def lead(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Lead:
        _require_user(info.context)
        row = await crm_service.get_lead(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Lead", str(id))
        return Lead.from_model(row)

    @strawberry.field
    async def deals(
        self,
        info: strawberry.Info[GraphQLContext, None],
        filters: CrmListFilter | None = None,
        pagination: PaginationInput | None = None,
    ) -> Connection[Deal]:
        return await _paginated_list(
            info.context,
            DealModel,
            Deal,
            filters,
            pagination or PaginationInput(),
            search_fields=[DealModel.name],
            status_field=DealModel.stage,
        )

    @strawberry.field
    async def deal(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Deal:
        _require_user(info.context)
        row = await crm_service.get_deal(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Deal", str(id))
        return Deal.from_model(row)

    @strawberry.field
    async def tasks(
        self,
        info: strawberry.Info[GraphQLContext, None],
        filters: CrmListFilter | None = None,
        pagination: PaginationInput | None = None,
    ) -> Connection[Task]:
        return await _paginated_list(
            info.context,
            TaskModel,
            Task,
            filters,
            pagination or PaginationInput(),
            search_fields=[TaskModel.title, TaskModel.description],
            status_field=TaskModel.status,
        )

    @strawberry.field
    async def task(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Task:
        _require_user(info.context)
        row = await crm_service.get_task(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Task", str(id))
        return Task.from_model(row)

    @strawberry.field
    async def notes(
        self,
        info: strawberry.Info[GraphQLContext, None],
        related_type: str | None = None,
        related_id: strawberry.ID | None = None,
        filters: CrmListFilter | None = None,
        pagination: PaginationInput | None = None,
    ) -> Connection[Note]:
        extra = None
        if related_type:
            extra = NoteModel.related_type == related_type
        if related_id:
            rid_filter = NoteModel.related_id == uuid.UUID(str(related_id))
            extra = rid_filter if extra is None else extra & rid_filter
        return await _paginated_list(
            info.context,
            NoteModel,
            Note,
            filters,
            pagination or PaginationInput(),
            search_fields=[NoteModel.body],
            extra_where=extra,
        )

    @strawberry.field
    async def note(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Note:
        _require_user(info.context)
        row = await crm_service.get_note(info.context.db, uuid.UUID(str(id)), info.context.user_id)
        if row is None:
            raise NotFoundError("Note", str(id))
        return Note.from_model(row)

    @strawberry.field(
        description="Fetch labels for all CRM entities in one request (replaces five REST calls)."
    )
    async def crm_record_labels(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> CrmRecordLabels:
        _require_user(info.context)
        ctx = info.context
        companies = await crm_service.list_companies(ctx.db, ctx.user_id)
        contacts = await crm_service.list_contacts(ctx.db, ctx.user_id)
        leads = await crm_service.list_leads(ctx.db, ctx.user_id)
        deals = await crm_service.list_deals(ctx.db, ctx.user_id)
        tasks = await crm_service.list_tasks(ctx.db, ctx.user_id)

        return CrmRecordLabels(
            companies=[
                RecordLabel(
                    id=strawberry.ID(str(c.id)),
                    label=c.name,
                    subtitle=c.domain or c.industry,
                    related_type="company",
                )
                for c in companies
            ],
            contacts=[
                RecordLabel(
                    id=strawberry.ID(str(c.id)),
                    label=f"{c.first_name} {c.last_name}".strip() or c.email or "Unnamed contact",
                    subtitle=" · ".join(filter(None, [c.title, c.email])) or None,
                    related_type="contact",
                )
                for c in contacts
            ],
            leads=[
                RecordLabel(
                    id=strawberry.ID(str(l.id)),
                    label=l.title or l.email or "Untitled lead",
                    subtitle=" · ".join(filter(None, [l.email, l.status.value])) or None,
                    related_type="lead",
                )
                for l in leads
            ],
            deals=[
                RecordLabel(
                    id=strawberry.ID(str(d.id)),
                    label=d.name,
                    subtitle=" · ".join(
                        filter(
                            None,
                            [
                                d.stage.value,
                                f"{d.currency} {d.amount}" if d.amount is not None else None,
                            ],
                        )
                    )
                    or None,
                    related_type="deal",
                )
                for d in deals
            ],
            tasks=[
                RecordLabel(
                    id=strawberry.ID(str(t.id)),
                    label=t.title,
                    subtitle=" · ".join(filter(None, [t.status.value, t.priority.value])) or None,
                    related_type="task",
                )
                for t in tasks
            ],
        )

    @strawberry.field(description="Search across all CRM entities.")
    async def search_crm(
        self,
        info: strawberry.Info[GraphQLContext, None],
        query: str,
        limit: int = 10,
    ) -> CrmSearchResult:
        _require_user(info.context)
        results = await crm_service.search_crm(
            info.context.db, info.context.user_id, query, limit=limit
        )
        return CrmSearchResult(
            companies=[Company.from_model(r) for r in results["companies"]],
            contacts=[Contact.from_model(r) for r in results["contacts"]],
            leads=[Lead.from_model(r) for r in results["leads"]],
            deals=[Deal.from_model(r) for r in results["deals"]],
            tasks=[Task.from_model(r) for r in results["tasks"]],
            notes=[Note.from_model(r) for r in results["notes"]],
        )

    @strawberry.field
    async def workflows(
        self,
        info: strawberry.Info[GraphQLContext, None],
        pagination: PaginationInput | None = None,
    ) -> Connection[Workflow]:
        _require_user(info.context)
        pagination = pagination or PaginationInput()
        rows = await workflow_service.list_workflows(info.context.db, info.context.user_id)
        total = len(rows)
        limit = max(1, min(pagination.limit, 100))
        offset = max(0, pagination.offset)
        page = rows[offset : offset + limit]
        return Connection(
            nodes=[Workflow.from_model(row) for row in page],
            page_info=build_page_info(total, pagination),
        )

    @strawberry.field
    async def workflow(
        self, info: strawberry.Info[GraphQLContext, None], id: strawberry.ID
    ) -> Workflow | None:
        _require_user(info.context)
        row = await workflow_service.get_workflow(
            info.context.db, uuid.UUID(str(id)), info.context.user_id
        )
        return Workflow.from_model(row) if row else None

    @strawberry.field
    async def ai_agents(self, info: strawberry.Info[GraphQLContext, None]) -> list[AIAgent]:
        _require_user(info.context)
        templates = await agent_service.list_all_templates(info.context.db, info.context.user_id)
        return [AIAgent.from_template(t) for t in templates]

    @strawberry.field
    async def integrations(self, info: strawberry.Info[GraphQLContext, None]) -> list[Integration]:
        _require_user(info.context)
        cards = await integration_service.list_provider_cards(info.context.db, info.context.user_id)
        return [Integration.from_card(c) for c in cards]

    @strawberry.field
    async def webhooks(self, info: strawberry.Info[GraphQLContext, None]) -> list[Webhook]:
        _require_user(info.context)
        service = WebhookService()
        rows = await service.list_endpoints(info.context.db, info.context.user_id)
        return [Webhook.from_model(row) for row in rows]

    @strawberry.field
    async def dashboard_metrics(
        self,
        info: strawberry.Info[GraphQLContext, None],
        days: int = 30,
    ) -> DashboardMetrics:
        _require_user(info.context)
        overview = await analytics_service.get_analytics_overview(
            info.context.db, info.context.user_id, days=days
        )
        return DashboardMetrics.from_overview(overview)
