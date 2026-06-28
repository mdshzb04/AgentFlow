import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.crm import DealStage, LeadStatus, TaskPriority, TaskStatus


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    domain: str | None = None
    industry: str | None = None
    size: str | None = None
    website: str | None = None
    phone: str | None = None
    address: str | None = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    domain: str | None = None
    industry: str | None = None
    size: str | None = None
    website: str | None = None
    phone: str | None = None
    address: str | None = None


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ContactBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str = Field(min_length=1, max_length=128)
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    status: str = "active"
    company_id: uuid.UUID | None = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=128)
    last_name: str | None = Field(default=None, min_length=1, max_length=128)
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    status: str | None = None
    company_id: uuid.UUID | None = None


class ContactRead(ContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class LeadBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    source: str | None = None
    status: LeadStatus = LeadStatus.NEW
    score: int | None = None
    value: float | None = None
    email: str | None = None
    phone: str | None = None
    notes_summary: str | None = None
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    source: str | None = None
    status: LeadStatus | None = None
    score: int | None = None
    value: float | None = None
    email: str | None = None
    phone: str | None = None
    notes_summary: str | None = None
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None


class LeadRead(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DealBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    stage: DealStage = DealStage.PROSPECTING
    amount: float | None = None
    currency: str = "USD"
    probability: int | None = None
    close_date: date | None = None
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    stage: DealStage | None = None
    amount: float | None = None
    currency: str | None = None
    probability: int | None = None
    close_date: date | None = None
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None


class DealRead(DealBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: date | None = None
    related_type: str | None = None
    related_id: uuid.UUID | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    related_type: str | None = None
    related_id: uuid.UUID | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class NoteBase(BaseModel):
    body: str = Field(min_length=1)
    related_type: str = Field(min_length=1, max_length=32)
    related_id: uuid.UUID


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    body: str | None = Field(default=None, min_length=1)


class NoteRead(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CrmActionRequest(BaseModel):
    entity: str
    action: str = "create"
    record_id: uuid.UUID | None = None
    fields: dict[str, Any] = Field(default_factory=dict)
