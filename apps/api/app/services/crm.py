import re
import uuid
from datetime import date
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import (
    Company,
    Contact,
    Deal,
    DealStage,
    Lead,
    LeadStatus,
    Note,
    Task,
    TaskPriority,
    TaskStatus,
)
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


async def _sync_after(
    db: AsyncSession, user_id: uuid.UUID, entity: str, record: Any
) -> None:
    try:
        from app.services.integrations.crm_sync_service import sync_crm_record

        await sync_crm_record(db, user_id, entity, record)
    except Exception:
        pass

    # Broadcast the change to connected n8n instances so external workflows
    # can react (e.g. a n8n flow that sends a Slack alert when a new lead lands).
    try:
        from app.services.integrations.crm_sync_service import broadcast_crm_event_to_n8n

        await broadcast_crm_event_to_n8n(db, user_id, entity, record)
    except Exception:
        pass


def _resolve_template(value: Any, context: dict[str, Any]) -> Any:
    if not isinstance(value, str):
        return value
    match = re.fullmatch(r"\{\{(.+?)\}\}", value.strip())
    if match:
        key = match.group(1).strip()
        return context.get(key, value)
    result = value
    for key, ctx_val in context.items():
        result = result.replace(f"{{{{{key}}}}}", str(ctx_val) if ctx_val is not None else "")
    return result


def resolve_fields(fields: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    resolved: dict[str, Any] = {}
    for key, val in fields.items():
        resolved[key] = _resolve_template(val, context)
    return resolved


def _parse_uuid(val: Any) -> uuid.UUID | None:
    if val is None or val == "":
        return None
    return uuid.UUID(str(val))


def _parse_date(val: Any) -> date | None:
    if val is None or val == "":
        return None
    if isinstance(val, date):
        return val
    return date.fromisoformat(str(val)[:10])


def _parse_float(val: Any) -> float | None:
    if val is None or val == "":
        return None
    return float(val)


def _parse_int(val: Any) -> int | None:
    if val is None or val == "":
        return None
    return int(val)


def _to_dict(record: Any) -> dict[str, Any]:
    data: dict[str, Any] = {"id": str(record.id)}
    for col in record.__table__.columns:
        if col.name in ("id", "user_id"):
            continue
        val = getattr(record, col.name)
        if isinstance(val, uuid.UUID):
            data[col.name] = str(val)
        elif hasattr(val, "value"):
            data[col.name] = val.value
        elif isinstance(val, date):
            data[col.name] = val.isoformat()
        else:
            data[col.name] = val
    return data


# --- Companies ---

async def list_companies(db: AsyncSession, user_id: uuid.UUID) -> list[Company]:
    result = await db.execute(
        select(Company).where(Company.user_id == user_id).order_by(Company.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_company(db: AsyncSession, company_id: uuid.UUID, user_id: uuid.UUID) -> Company | None:
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_company(db: AsyncSession, user_id: uuid.UUID, data: CompanyCreate) -> Company:
    company = Company(user_id=user_id, **data.model_dump())
    db.add(company)
    await db.flush()
    await _sync_after(db, user_id, "company", company)
    return company


async def update_company(
    db: AsyncSession, company: Company, data: CompanyUpdate
) -> Company:
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(company, key, val)
    await db.flush()
    await _sync_after(db, company.user_id, "company", company)
    return company


async def delete_company(db: AsyncSession, company: Company) -> None:
    await db.delete(company)
    await db.flush()


# --- Contacts ---

async def list_contacts(db: AsyncSession, user_id: uuid.UUID) -> list[Contact]:
    result = await db.execute(
        select(Contact).where(Contact.user_id == user_id).order_by(Contact.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_contact(db: AsyncSession, contact_id: uuid.UUID, user_id: uuid.UUID) -> Contact | None:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def lookup_contact(db: AsyncSession, user_id: uuid.UUID, query: str) -> Contact | None:
    q = query.strip().lower()
    result = await db.execute(
        select(Contact).where(
            Contact.user_id == user_id,
            or_(
                Contact.email.ilike(f"%{q}%"),
                Contact.first_name.ilike(f"%{q}%"),
                Contact.last_name.ilike(f"%{q}%"),
            ),
        ).limit(1)
    )
    return result.scalar_one_or_none()


async def create_contact(db: AsyncSession, user_id: uuid.UUID, data: ContactCreate) -> Contact:
    contact = Contact(user_id=user_id, **data.model_dump())
    db.add(contact)
    await db.flush()
    await _sync_after(db, user_id, "contact", contact)
    return contact


async def update_contact(db: AsyncSession, contact: Contact, data: ContactUpdate) -> Contact:
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(contact, key, val)
    await db.flush()
    await _sync_after(db, contact.user_id, "contact", contact)
    return contact


async def delete_contact(db: AsyncSession, contact: Contact) -> None:
    await db.delete(contact)
    await db.flush()


# --- Leads ---

async def list_leads(db: AsyncSession, user_id: uuid.UUID) -> list[Lead]:
    result = await db.execute(
        select(Lead).where(Lead.user_id == user_id).order_by(Lead.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_lead(db: AsyncSession, lead_id: uuid.UUID, user_id: uuid.UUID) -> Lead | None:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_lead(db: AsyncSession, user_id: uuid.UUID, data: LeadCreate) -> Lead:
    lead = Lead(user_id=user_id, **data.model_dump())
    db.add(lead)
    await db.flush()
    await _sync_after(db, user_id, "lead", lead)
    return lead


async def update_lead(db: AsyncSession, lead: Lead, data: LeadUpdate) -> Lead:
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(lead, key, val)
    await db.flush()
    await _sync_after(db, lead.user_id, "lead", lead)
    return lead


async def delete_lead(db: AsyncSession, lead: Lead) -> None:
    await db.delete(lead)
    await db.flush()


# --- Deals ---

async def list_deals(db: AsyncSession, user_id: uuid.UUID) -> list[Deal]:
    result = await db.execute(
        select(Deal).where(Deal.user_id == user_id).order_by(Deal.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_deal(db: AsyncSession, deal_id: uuid.UUID, user_id: uuid.UUID) -> Deal | None:
    result = await db.execute(
        select(Deal).where(Deal.id == deal_id, Deal.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_deal(db: AsyncSession, user_id: uuid.UUID, data: DealCreate) -> Deal:
    deal = Deal(user_id=user_id, **data.model_dump())
    db.add(deal)
    await db.flush()
    await _sync_after(db, user_id, "deal", deal)
    return deal


async def update_deal(db: AsyncSession, deal: Deal, data: DealUpdate) -> Deal:
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(deal, key, val)
    await db.flush()
    await _sync_after(db, deal.user_id, "deal", deal)
    return deal


async def delete_deal(db: AsyncSession, deal: Deal) -> None:
    await db.delete(deal)
    await db.flush()


# --- Tasks ---

async def list_tasks(db: AsyncSession, user_id: uuid.UUID) -> list[Task]:
    result = await db.execute(
        select(Task).where(Task.user_id == user_id).order_by(Task.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_task(db: AsyncSession, user_id: uuid.UUID, data: TaskCreate) -> Task:
    task = Task(user_id=user_id, **data.model_dump())
    db.add(task)
    await db.flush()
    await _sync_after(db, user_id, "task", task)
    return task


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(task, key, val)
    await db.flush()
    await _sync_after(db, task.user_id, "task", task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.flush()


# --- Notes ---

async def list_notes(
    db: AsyncSession,
    user_id: uuid.UUID,
    related_type: str | None = None,
    related_id: uuid.UUID | None = None,
) -> list[Note]:
    query = select(Note).where(Note.user_id == user_id)
    if related_type:
        query = query.where(Note.related_type == related_type)
    if related_id:
        query = query.where(Note.related_id == related_id)
    query = query.order_by(Note.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_note(db: AsyncSession, note_id: uuid.UUID, user_id: uuid.UUID) -> Note | None:
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_note(db: AsyncSession, user_id: uuid.UUID, data: NoteCreate) -> Note:
    note = Note(user_id=user_id, **data.model_dump())
    db.add(note)
    await db.flush()
    await _sync_after(db, user_id, "note", note)
    return note


async def update_note(db: AsyncSession, note: Note, data: NoteUpdate) -> Note:
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(note, key, val)
    await db.flush()
    await _sync_after(db, note.user_id, "note", note)
    return note


async def delete_note(db: AsyncSession, note: Note) -> None:
    await db.delete(note)
    await db.flush()


async def complete_task(db: AsyncSession, task: Task) -> Task:
    return await update_task(db, task, TaskUpdate(status=TaskStatus.COMPLETED))


async def convert_lead(
    db: AsyncSession,
    user_id: uuid.UUID,
    lead: Lead,
    *,
    create_contact_record: bool = True,
    create_deal_record: bool = False,
    deal_name: str | None = None,
) -> dict[str, Any]:
    """Mark a lead converted and optionally create linked contact/deal records."""
    contact: Contact | None = None
    deal: Deal | None = None

    if create_contact_record and lead.email:
        existing = await lookup_contact(db, user_id, lead.email)
        if existing:
            contact = existing
        else:
            title_parts = lead.title.split(" ", 1)
            contact = await create_contact(
                db,
                user_id,
                ContactCreate(
                    first_name=title_parts[0][:128],
                    last_name=(title_parts[1] if len(title_parts) > 1 else "Lead")[:128],
                    email=lead.email,
                    phone=lead.phone,
                    company_id=lead.company_id,
                    status="active",
                ),
            )
        lead.contact_id = contact.id

    if create_deal_record:
        deal = await create_deal(
            db,
            user_id,
            DealCreate(
                name=deal_name or f"{lead.title} Deal",
                stage=DealStage.QUALIFICATION,
                company_id=lead.company_id,
                contact_id=lead.contact_id or (contact.id if contact else None),
                amount=lead.value,
            ),
        )

    lead.status = LeadStatus.CONVERTED
    await db.flush()
    return {"lead": lead, "contact": contact, "deal": deal}


async def search_crm(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    *,
    limit: int = 10,
) -> dict[str, list[Any]]:
    """Search across CRM entities for GraphQL searchCRM."""
    q = query.strip()
    if not q:
        return {"companies": [], "contacts": [], "leads": [], "deals": [], "tasks": [], "notes": []}

    limit = max(1, min(limit, 50))
    pattern = f"%{q}%"

    companies = list(
        (
            await db.execute(
                select(Company)
                .where(
                    Company.user_id == user_id,
                    or_(Company.name.ilike(pattern), Company.domain.ilike(pattern)),
                )
                .limit(limit)
            )
        ).scalars()
    )
    contacts = list(
        (
            await db.execute(
                select(Contact)
                .where(
                    Contact.user_id == user_id,
                    or_(
                        Contact.email.ilike(pattern),
                        Contact.first_name.ilike(pattern),
                        Contact.last_name.ilike(pattern),
                    ),
                )
                .limit(limit)
            )
        ).scalars()
    )
    leads = list(
        (
            await db.execute(
                select(Lead)
                .where(
                    Lead.user_id == user_id,
                    or_(
                        Lead.title.ilike(pattern),
                        Lead.email.ilike(pattern),
                        Lead.source.ilike(pattern),
                    ),
                )
                .limit(limit)
            )
        ).scalars()
    )
    deals = list(
        (
            await db.execute(
                select(Deal)
                .where(Deal.user_id == user_id, Deal.name.ilike(pattern))
                .limit(limit)
            )
        ).scalars()
    )
    tasks = list(
        (
            await db.execute(
                select(Task)
                .where(
                    Task.user_id == user_id,
                    or_(Task.title.ilike(pattern), Task.description.ilike(pattern)),
                )
                .limit(limit)
            )
        ).scalars()
    )
    notes = list(
        (
            await db.execute(
                select(Note).where(Note.user_id == user_id, Note.body.ilike(pattern)).limit(limit)
            )
        ).scalars()
    )

    return {
        "companies": companies,
        "contacts": contacts,
        "leads": leads,
        "deals": deals,
        "tasks": tasks,
        "notes": notes,
    }


# --- Workflow / AI actions ---

async def execute_crm_action(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    entity: str,
    action: str,
    record_id: uuid.UUID | None = None,
    fields: dict[str, Any],
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    resolved = resolve_fields(fields, context or {})
    entity = entity.lower()
    action = action.lower()

    if action == "create":
        return await _create_from_fields(db, user_id, entity, resolved)
    if action == "update":
        if not record_id:
            rid = resolved.get("id") or resolved.get("record_id")
            record_id = _parse_uuid(rid)
        if not record_id:
            return {"error": "record_id required for update"}
        return await _update_from_fields(db, user_id, entity, record_id, resolved)
    return {"error": f"Unknown action: {action}"}


async def _create_from_fields(
    db: AsyncSession, user_id: uuid.UUID, entity: str, fields: dict[str, Any]
) -> dict[str, Any]:
    if entity == "company":
        record = await create_company(
            db, user_id, CompanyCreate(name=str(fields.get("name", "Untitled Company")), **{
                k: fields[k] for k in ("domain", "industry", "size", "website", "phone", "address")
                if k in fields and fields[k]
            })
        )
    elif entity == "contact":
        name = fields.get("name", "")
        parts = str(name).split(" ", 1) if name else ["", ""]
        record = await create_contact(
            db,
            user_id,
            ContactCreate(
                first_name=str(fields.get("first_name") or parts[0] or "Unknown"),
                last_name=str(fields.get("last_name") or (parts[1] if len(parts) > 1 else "")),
                email=fields.get("email"),
                phone=fields.get("phone"),
                title=fields.get("title"),
                status=str(fields.get("status", "active")),
                company_id=_parse_uuid(fields.get("company_id")),
            ),
        )
    elif entity == "lead":
        status_val = fields.get("status", "new")
        try:
            status = LeadStatus(str(status_val))
        except ValueError:
            status = LeadStatus.NEW
        record = await create_lead(
            db,
            user_id,
            LeadCreate(
                title=str(fields.get("title") or fields.get("name") or "New Lead"),
                source=fields.get("source"),
                status=status,
                score=_parse_int(fields.get("score")),
                value=_parse_float(fields.get("value")),
                email=fields.get("email"),
                phone=fields.get("phone"),
                notes_summary=fields.get("notes_summary") or fields.get("notes"),
                company_id=_parse_uuid(fields.get("company_id")),
                contact_id=_parse_uuid(fields.get("contact_id")),
            ),
        )
    elif entity == "deal":
        stage_val = fields.get("stage", "prospecting")
        try:
            stage = DealStage(str(stage_val))
        except ValueError:
            stage = DealStage.PROSPECTING
        record = await create_deal(
            db,
            user_id,
            DealCreate(
                name=str(fields.get("name") or "New Deal"),
                stage=stage,
                amount=_parse_float(fields.get("amount")),
                currency=str(fields.get("currency", "USD")),
                probability=_parse_int(fields.get("probability")),
                close_date=_parse_date(fields.get("close_date")),
                company_id=_parse_uuid(fields.get("company_id")),
                contact_id=_parse_uuid(fields.get("contact_id")),
            ),
        )
    elif entity == "task":
        status_val = fields.get("status", "pending")
        priority_val = fields.get("priority", "medium")
        try:
            tstatus = TaskStatus(str(status_val))
        except ValueError:
            tstatus = TaskStatus.PENDING
        try:
            tpriority = TaskPriority(str(priority_val))
        except ValueError:
            tpriority = TaskPriority.MEDIUM
        record = await create_task(
            db,
            user_id,
            TaskCreate(
                title=str(fields.get("title") or fields.get("task") or "New Task"),
                description=fields.get("description"),
                status=tstatus,
                priority=tpriority,
                due_date=_parse_date(fields.get("due_date")),
                related_type=fields.get("related_type"),
                related_id=_parse_uuid(fields.get("related_id")),
            ),
        )
    elif entity == "note":
        if not fields.get("body") or not fields.get("related_type") or not fields.get("related_id"):
            return {"error": "note requires body, related_type, and related_id"}
        record = await create_note(
            db,
            user_id,
            NoteCreate(
                body=str(fields["body"]),
                related_type=str(fields["related_type"]),
                related_id=_parse_uuid(fields["related_id"]),  # type: ignore[arg-type]
            ),
        )
    else:
        return {"error": f"Unknown entity: {entity}"}

    payload = _to_dict(record)
    return {"created": True, "entity": entity, "record": payload}


async def _update_from_fields(
    db: AsyncSession,
    user_id: uuid.UUID,
    entity: str,
    record_id: uuid.UUID,
    fields: dict[str, Any],
) -> dict[str, Any]:
    fields = {k: v for k, v in fields.items() if k not in ("id", "record_id")}

    if entity == "company":
        record = await get_company(db, record_id, user_id)
        if not record:
            return {"error": "Company not found"}
        updated = await update_company(db, record, CompanyUpdate(**fields))
    elif entity == "contact":
        record = await get_contact(db, record_id, user_id)
        if not record:
            return {"error": "Contact not found"}
        if "name" in fields and "first_name" not in fields:
            parts = str(fields.pop("name")).split(" ", 1)
            fields.setdefault("first_name", parts[0])
            if len(parts) > 1:
                fields.setdefault("last_name", parts[1])
        updated = await update_contact(db, record, ContactUpdate(**fields))
    elif entity == "lead":
        record = await get_lead(db, record_id, user_id)
        if not record:
            return {"error": "Lead not found"}
        if "status" in fields:
            fields["status"] = LeadStatus(str(fields["status"]))
        if "score" in fields:
            fields["score"] = _parse_int(fields["score"])
        if "value" in fields:
            fields["value"] = _parse_float(fields["value"])
        updated = await update_lead(db, record, LeadUpdate(**fields))
    elif entity == "deal":
        record = await get_deal(db, record_id, user_id)
        if not record:
            return {"error": "Deal not found"}
        if "stage" in fields:
            fields["stage"] = DealStage(str(fields["stage"]))
        if "amount" in fields:
            fields["amount"] = _parse_float(fields["amount"])
        if "probability" in fields:
            fields["probability"] = _parse_int(fields["probability"])
        if "close_date" in fields:
            fields["close_date"] = _parse_date(fields["close_date"])
        updated = await update_deal(db, record, DealUpdate(**fields))
    elif entity == "task":
        record = await get_task(db, record_id, user_id)
        if not record:
            return {"error": "Task not found"}
        if "status" in fields:
            fields["status"] = TaskStatus(str(fields["status"]))
        if "priority" in fields:
            fields["priority"] = TaskPriority(str(fields["priority"]))
        if "due_date" in fields:
            fields["due_date"] = _parse_date(fields["due_date"])
        updated = await update_task(db, record, TaskUpdate(**fields))
    elif entity == "note":
        record = await get_note(db, record_id, user_id)
        if not record:
            return {"error": "Note not found"}
        updated = await update_note(db, record, NoteUpdate(**fields))
    else:
        return {"error": f"Unknown entity: {entity}"}

    return {"updated": True, "entity": entity, "record": _to_dict(updated)}
