import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.crm import (
    CompanyCreate,
    CompanyRead,
    CompanyUpdate,
    ContactCreate,
    ContactRead,
    ContactUpdate,
    CrmActionRequest,
    DealCreate,
    DealRead,
    DealUpdate,
    LeadCreate,
    LeadRead,
    LeadUpdate,
    NoteCreate,
    NoteRead,
    NoteUpdate,
    TaskCreate,
    TaskRead,
    TaskUpdate,
)
from app.services import crm as crm_service
router = APIRouter(prefix="/crm", tags=["crm"])


@router.get("/companies", response_model=list[CompanyRead])
async def list_companies(current_user: CurrentUser, db: DbSession) -> list[CompanyRead]:
    return await crm_service.list_companies(db, current_user.id)


@router.post("/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: CompanyCreate, current_user: CurrentUser, db: DbSession
) -> CompanyRead:
    return await crm_service.create_company(db, current_user.id, body)


@router.get("/companies/{company_id}", response_model=CompanyRead)
async def get_company(
    company_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> CompanyRead:
    company = await crm_service.get_company(db, company_id, current_user.id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


@router.patch("/companies/{company_id}", response_model=CompanyRead)
async def update_company(
    company_id: uuid.UUID,
    body: CompanyUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> CompanyRead:
    company = await crm_service.get_company(db, company_id, current_user.id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return await crm_service.update_company(db, company, body)


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    company = await crm_service.get_company(db, company_id, current_user.id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    await crm_service.delete_company(db, company)


@router.get("/contacts", response_model=list[ContactRead])
async def list_contacts(current_user: CurrentUser, db: DbSession) -> list[ContactRead]:
    return await crm_service.list_contacts(db, current_user.id)


@router.post("/contacts", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreate, current_user: CurrentUser, db: DbSession
) -> ContactRead:
    return await crm_service.create_contact(db, current_user.id, body)


@router.get("/contacts/{contact_id}", response_model=ContactRead)
async def get_contact(
    contact_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> ContactRead:
    contact = await crm_service.get_contact(db, contact_id, current_user.id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.patch("/contacts/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: uuid.UUID,
    body: ContactUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> ContactRead:
    contact = await crm_service.get_contact(db, contact_id, current_user.id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return await crm_service.update_contact(db, contact, body)


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    contact = await crm_service.get_contact(db, contact_id, current_user.id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    await crm_service.delete_contact(db, contact)


@router.get("/leads", response_model=list[LeadRead])
async def list_leads(current_user: CurrentUser, db: DbSession) -> list[LeadRead]:
    return await crm_service.list_leads(db, current_user.id)


@router.post("/leads", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
async def create_lead(body: LeadCreate, current_user: CurrentUser, db: DbSession) -> LeadRead:
    return await crm_service.create_lead(db, current_user.id, body)


@router.get("/leads/{lead_id}", response_model=LeadRead)
async def get_lead(
    lead_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> LeadRead:
    lead = await crm_service.get_lead(db, lead_id, current_user.id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}", response_model=LeadRead)
async def update_lead(
    lead_id: uuid.UUID,
    body: LeadUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> LeadRead:
    lead = await crm_service.get_lead(db, lead_id, current_user.id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return await crm_service.update_lead(db, lead, body)


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(lead_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> None:
    lead = await crm_service.get_lead(db, lead_id, current_user.id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    await crm_service.delete_lead(db, lead)


@router.get("/deals", response_model=list[DealRead])
async def list_deals(current_user: CurrentUser, db: DbSession) -> list[DealRead]:
    return await crm_service.list_deals(db, current_user.id)


@router.post("/deals", response_model=DealRead, status_code=status.HTTP_201_CREATED)
async def create_deal(body: DealCreate, current_user: CurrentUser, db: DbSession) -> DealRead:
    return await crm_service.create_deal(db, current_user.id, body)


@router.get("/deals/{deal_id}", response_model=DealRead)
async def get_deal(deal_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> DealRead:
    deal = await crm_service.get_deal(db, deal_id, current_user.id)
    if deal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    return deal


@router.patch("/deals/{deal_id}", response_model=DealRead)
async def update_deal(
    deal_id: uuid.UUID,
    body: DealUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> DealRead:
    deal = await crm_service.get_deal(db, deal_id, current_user.id)
    if deal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    return await crm_service.update_deal(db, deal, body)


@router.delete("/deals/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(deal_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> None:
    deal = await crm_service.get_deal(db, deal_id, current_user.id)
    if deal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
    await crm_service.delete_deal(db, deal)


@router.get("/tasks", response_model=list[TaskRead])
async def list_tasks(current_user: CurrentUser, db: DbSession) -> list[TaskRead]:
    return await crm_service.list_tasks(db, current_user.id)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(body: TaskCreate, current_user: CurrentUser, db: DbSession) -> TaskRead:
    return await crm_service.create_task(db, current_user.id, body)


@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(task_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> TaskRead:
    task = await crm_service.get_task(db, task_id, current_user.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> TaskRead:
    task = await crm_service.get_task(db, task_id, current_user.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return await crm_service.update_task(db, task, body)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> None:
    task = await crm_service.get_task(db, task_id, current_user.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await crm_service.delete_task(db, task)


@router.get("/notes", response_model=list[NoteRead])
async def list_notes(
    current_user: CurrentUser,
    db: DbSession,
    related_type: str | None = Query(default=None),
    related_id: uuid.UUID | None = Query(default=None),
) -> list[NoteRead]:
    return await crm_service.list_notes(db, current_user.id, related_type, related_id)


@router.post("/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(body: NoteCreate, current_user: CurrentUser, db: DbSession) -> NoteRead:
    return await crm_service.create_note(db, current_user.id, body)


@router.get("/notes/{note_id}", response_model=NoteRead)
async def get_note(note_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> NoteRead:
    note = await crm_service.get_note(db, note_id, current_user.id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.patch("/notes/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> NoteRead:
    note = await crm_service.get_note(db, note_id, current_user.id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return await crm_service.update_note(db, note, body)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> None:
    note = await crm_service.get_note(db, note_id, current_user.id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    await crm_service.delete_note(db, note)


@router.post("/actions")
async def run_crm_action(
    body: CrmActionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    return await crm_service.execute_crm_action(
        db,
        current_user.id,
        entity=body.entity,
        action=body.action,
        record_id=body.record_id,
        fields=body.fields,
    )
