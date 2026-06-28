"""GraphQL object types for CRM entities."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Annotated

import strawberry

from app.graphql.types.enums import (
    GqlDealStage,
    GqlLeadStatus,
    GqlTaskPriority,
    GqlTaskStatus,
    to_gql_enum,
)
from app.models.crm import Company as CompanyModel
from app.models.crm import Contact as ContactModel
from app.models.crm import Deal as DealModel
from app.models.crm import Lead as LeadModel
from app.models.crm import Note as NoteModel
from app.models.crm import Task as TaskModel

if TYPE_CHECKING:
    from app.graphql.context import GraphQLContext


@strawberry.type(description="Organization or account.")
class Company:
    id: strawberry.ID
    name: str
    domain: str | None
    industry: str | None
    size: str | None
    website: str | None
    phone: str | None
    address: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: CompanyModel) -> Company:
        return cls(
            id=strawberry.ID(str(model.id)),
            name=model.name,
            domain=model.domain,
            industry=model.industry,
            size=model.size,
            website=model.website,
            phone=model.phone,
            address=model.address,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @strawberry.field
    async def contacts(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> list[Annotated["Contact", strawberry.lazy("app.graphql.types.crm")]]:
        ctx = info.context
        if ctx.loaders is None:
            return []
        rows = await ctx.loaders.contacts_by_company.load(uuid.UUID(str(self.id)))
        return [Contact.from_model(row) for row in rows]

    @strawberry.field
    async def deals(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> list[Annotated["Deal", strawberry.lazy("app.graphql.types.crm")]]:
        ctx = info.context
        if ctx.loaders is None:
            return []
        rows = await ctx.loaders.deals_by_company.load(uuid.UUID(str(self.id)))
        return [Deal.from_model(row) for row in rows]

    @strawberry.field
    async def leads(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> list[Annotated["Lead", strawberry.lazy("app.graphql.types.crm")]]:
        ctx = info.context
        if ctx.loaders is None:
            return []
        rows = await ctx.loaders.leads_by_company.load(uuid.UUID(str(self.id)))
        return [Lead.from_model(row) for row in rows]


@strawberry.type(description="Person associated with a company.")
class Contact:
    id: strawberry.ID
    company_id: strawberry.ID | None
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    title: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: ContactModel) -> Contact:
        return cls(
            id=strawberry.ID(str(model.id)),
            company_id=strawberry.ID(str(model.company_id)) if model.company_id else None,
            first_name=model.first_name,
            last_name=model.last_name,
            email=model.email,
            phone=model.phone,
            title=model.title,
            status=model.status,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @strawberry.field
    async def company(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> Company | None:
        if not self.company_id:
            return None
        ctx = info.context
        if ctx.loaders is None:
            return None
        row = await ctx.loaders.company_by_id.load(uuid.UUID(str(self.company_id)))
        return Company.from_model(row) if row else None


@strawberry.type(description="Sales lead.")
class Lead:
    id: strawberry.ID
    company_id: strawberry.ID | None
    contact_id: strawberry.ID | None
    title: str
    source: str | None
    status: GqlLeadStatus
    score: int | None
    value: float | None
    email: str | None
    phone: str | None
    notes_summary: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: LeadModel) -> Lead:
        return cls(
            id=strawberry.ID(str(model.id)),
            company_id=strawberry.ID(str(model.company_id)) if model.company_id else None,
            contact_id=strawberry.ID(str(model.contact_id)) if model.contact_id else None,
            title=model.title,
            source=model.source,
            status=to_gql_enum(model.status, GqlLeadStatus),
            score=model.score,
            value=float(model.value) if model.value is not None else None,
            email=model.email,
            phone=model.phone,
            notes_summary=model.notes_summary,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @strawberry.field
    async def company(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> Company | None:
        if not self.company_id:
            return None
        ctx = info.context
        if ctx.loaders is None:
            return None
        row = await ctx.loaders.company_by_id.load(uuid.UUID(str(self.company_id)))
        return Company.from_model(row) if row else None

    @strawberry.field
    async def contact(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> Contact | None:
        if not self.contact_id:
            return None
        ctx = info.context
        if ctx.loaders is None:
            return None
        from sqlalchemy import select

        from app.models.crm import Contact as ContactModel

        result = await ctx.db.execute(
            select(ContactModel).where(
                ContactModel.id == uuid.UUID(str(self.contact_id)),
                ContactModel.user_id == ctx.user_id,
            )
        )
        row = result.scalar_one_or_none()
        return Contact.from_model(row) if row else None


@strawberry.type(description="Sales opportunity.")
class Deal:
    id: strawberry.ID
    company_id: strawberry.ID | None
    contact_id: strawberry.ID | None
    name: str
    stage: GqlDealStage
    amount: float | None
    currency: str
    probability: int | None
    close_date: date | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: DealModel) -> Deal:
        return cls(
            id=strawberry.ID(str(model.id)),
            company_id=strawberry.ID(str(model.company_id)) if model.company_id else None,
            contact_id=strawberry.ID(str(model.contact_id)) if model.contact_id else None,
            name=model.name,
            stage=to_gql_enum(model.stage, GqlDealStage),
            amount=float(model.amount) if model.amount is not None else None,
            currency=model.currency,
            probability=model.probability,
            close_date=model.close_date,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @strawberry.field
    async def company(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> Company | None:
        if not self.company_id:
            return None
        ctx = info.context
        if ctx.loaders is None:
            return None
        row = await ctx.loaders.company_by_id.load(uuid.UUID(str(self.company_id)))
        return Company.from_model(row) if row else None

    @strawberry.field
    async def tasks(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> list[Task]:
        ctx = info.context
        if ctx.loaders is None:
            return []
        rows = await ctx.loaders.tasks_by_deal.load(uuid.UUID(str(self.id)))
        return [Task.from_model(row) for row in rows]


@strawberry.type(description="CRM task.")
class Task:
    id: strawberry.ID
    title: str
    description: str | None
    status: GqlTaskStatus
    priority: GqlTaskPriority
    due_date: date | None
    related_type: str | None
    related_id: strawberry.ID | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: TaskModel) -> Task:
        return cls(
            id=strawberry.ID(str(model.id)),
            title=model.title,
            description=model.description,
            status=to_gql_enum(model.status, GqlTaskStatus),
            priority=to_gql_enum(model.priority, GqlTaskPriority),
            due_date=model.due_date,
            related_type=model.related_type,
            related_id=strawberry.ID(str(model.related_id)) if model.related_id else None,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


@strawberry.type(description="Note attached to a CRM record.")
class Note:
    id: strawberry.ID
    body: str
    related_type: str
    related_id: strawberry.ID
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: NoteModel) -> Note:
        return cls(
            id=strawberry.ID(str(model.id)),
            body=model.body,
            related_type=model.related_type,
            related_id=strawberry.ID(str(model.related_id)),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


@strawberry.type(description="Label for a CRM record used in pickers.")
class RecordLabel:
    id: strawberry.ID
    label: str
    subtitle: str | None = None
    related_type: str | None = None


@strawberry.type(description="Nested CRM record labels in a single query.")
class CrmRecordLabels:
    companies: list[RecordLabel]
    contacts: list[RecordLabel]
    leads: list[RecordLabel]
    deals: list[RecordLabel]
    tasks: list[RecordLabel]


@strawberry.type(description="Cross-entity CRM search results.")
class CrmSearchResult:
    companies: list[Company]
    contacts: list[Contact]
    leads: list[Lead]
    deals: list[Deal]
    tasks: list[Task]
    notes: list[Note]


@strawberry.type(description="Lead conversion result.")
class ConvertLeadPayload:
    lead: Lead
    contact: Contact | None
    deal: Deal | None
