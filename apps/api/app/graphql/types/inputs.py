"""GraphQL input types for CRM mutations."""

from __future__ import annotations

from datetime import date

import strawberry
from strawberry.scalars import JSON

from app.graphql.types.enums import GqlDealStage, GqlLeadStatus, GqlTaskPriority, GqlTaskStatus


@strawberry.input
class CompanyCreateInput:
    name: str
    domain: str | None = None
    industry: str | None = None
    size: str | None = None
    website: str | None = None
    phone: str | None = None
    address: str | None = None


@strawberry.input
class CompanyUpdateInput:
    name: str | None = None
    domain: str | None = None
    industry: str | None = None
    size: str | None = None
    website: str | None = None
    phone: str | None = None
    address: str | None = None


@strawberry.input
class ContactCreateInput:
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    status: str = "active"
    company_id: strawberry.ID | None = None


@strawberry.input
class ContactUpdateInput:
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    status: str | None = None
    company_id: strawberry.ID | None = None


@strawberry.input
class LeadCreateInput:
    title: str
    source: str | None = None
    status: GqlLeadStatus = GqlLeadStatus.new
    score: int | None = None
    value: float | None = None
    email: str | None = None
    phone: str | None = None
    notes_summary: str | None = None
    company_id: strawberry.ID | None = None
    contact_id: strawberry.ID | None = None


@strawberry.input
class LeadUpdateInput:
    title: str | None = None
    source: str | None = None
    status: GqlLeadStatus | None = None
    score: int | None = None
    value: float | None = None
    email: str | None = None
    phone: str | None = None
    notes_summary: str | None = None
    company_id: strawberry.ID | None = None
    contact_id: strawberry.ID | None = None


@strawberry.input
class DealCreateInput:
    name: str
    stage: GqlDealStage = GqlDealStage.prospecting
    amount: float | None = None
    currency: str = "USD"
    probability: int | None = None
    close_date: date | None = None
    company_id: strawberry.ID | None = None
    contact_id: strawberry.ID | None = None


@strawberry.input
class DealUpdateInput:
    name: str | None = None
    stage: GqlDealStage | None = None
    amount: float | None = None
    currency: str | None = None
    probability: int | None = None
    close_date: date | None = None
    company_id: strawberry.ID | None = None
    contact_id: strawberry.ID | None = None


@strawberry.input
class TaskCreateInput:
    title: str
    description: str | None = None
    status: GqlTaskStatus = GqlTaskStatus.pending
    priority: GqlTaskPriority = GqlTaskPriority.medium
    due_date: date | None = None
    related_type: str | None = None
    related_id: strawberry.ID | None = None


@strawberry.input
class TaskUpdateInput:
    title: str | None = None
    description: str | None = None
    status: GqlTaskStatus | None = None
    priority: GqlTaskPriority | None = None
    due_date: date | None = None
    related_type: str | None = None
    related_id: strawberry.ID | None = None


@strawberry.input
class NoteCreateInput:
    body: str
    related_type: str
    related_id: strawberry.ID


@strawberry.input
class NoteUpdateInput:
    body: str | None = None
    related_type: str | None = None
    related_id: strawberry.ID | None = None


@strawberry.input
class ConvertLeadInput:
    create_contact_record: bool = True
    create_deal_record: bool = False
    deal_name: str | None = None


@strawberry.input
class RunAIAgentInput:
    template: str | None = None
    provider: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    user_prompt: str | None = None
    variables: JSON | None = None
    input: JSON | None = None


@strawberry.input
class ExecuteWorkflowInput:
    workflow_id: strawberry.ID
    input: JSON | None = None


@strawberry.input
class ConnectIntegrationInput:
    provider: str
    base_url: str | None = None
    api_key: str | None = None


@strawberry.input
class CreateWebhookInput:
    name: str
    workflow_id: strawberry.ID | None = None
