"""Google Sheets CRM sync — append real spreadsheet rows for CRM entities, AI outputs, and workflow logs."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Contact, Deal, Lead, Note, Task
from app.models.integration import IntegrationProvider
from app.models.integration_platform import IntegrationAuditLog
from app.services.integrations.accounts import list_accounts, refresh_google_token

logger = logging.getLogger(__name__)

SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

ENTITY_HEADERS: dict[str, list[str]] = {
    "lead": ["ID", "Title", "Status", "Source", "Email", "Phone", "Score", "Value", "Created At"],
    "contact": ["ID", "First Name", "Last Name", "Email", "Phone", "Title", "Status", "Created At"],
    "deal": ["ID", "Name", "Stage", "Amount", "Currency", "Probability", "Close Date", "Created At"],
    "task": ["ID", "Title", "Status", "Priority", "Due Date", "Description", "Created At"],
    "note": ["ID", "Related Type", "Related ID", "Body", "Created At"],
    "ai_output": ["Execution ID", "Provider", "Model", "Tokens", "Cost USD", "Preview", "Created At"],
    "workflow_log": ["Execution ID", "Workflow ID", "Status", "Node ID", "Node Type", "Duration ms", "Created At"],
}

ENTITY_TAB: dict[str, str] = {
    "lead": "Leads",
    "contact": "Contacts",
    "deal": "Deals",
    "task": "Tasks",
    "note": "Notes",
    "ai_output": "AI Outputs",
    "workflow_log": "Workflow Logs",
}


async def _get_sheets_account(db: AsyncSession, user_id: uuid.UUID):
    accounts = await list_accounts(db, user_id, provider=IntegrationProvider.GOOGLE_SHEETS)
    return accounts[0] if accounts else None


async def _ensure_tab_and_headers(
    access_token: str,
    spreadsheet_id: str,
    tab: str,
    headers: list[str],
) -> None:
    """Create the tab if missing and write a header row if the sheet is empty."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        meta = await client.get(
            f"{SHEETS_API}/{spreadsheet_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        meta.raise_for_status()
        sheets = meta.json().get("sheets", [])
        titles = [s.get("properties", {}).get("title", "") for s in sheets]

        if tab not in titles:
            await client.post(
                f"{SHEETS_API}/{spreadsheet_id}:batchUpdate",
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "requests": [
                        {
                            "addSheet": {
                                "properties": {"title": tab}
                            }
                        }
                    ]
                },
            )
            # write header row for the new tab
            await _append_row(access_token, spreadsheet_id, f"{tab}!A1", [headers])
        else:
            # write header if empty
            rng = await client.get(
                f"{SHEETS_API}/{spreadsheet_id}/values/{tab}!A1:Z1",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if rng.status_code < 400:
                values = rng.json().get("values", [])
                if not values:
                    await _append_row(access_token, spreadsheet_id, f"{tab}!A1", [headers])


async def _append_row(
    access_token: str,
    spreadsheet_id: str,
    range_: str,
    values: list[list[Any]],
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{SHEETS_API}/{spreadsheet_id}/values/{range_}:append",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"valueInputOption": "USER_ENTERED", "insertDataOption": "INSERT_ROWS"},
            json={"values": values},
        )
        resp.raise_for_status()
        return resp.json()


def _row_for(entity: str, record: Any) -> list[Any]:
    if entity == "lead":
        return [
            str(record.id), record.title, record.status.value if record.status else "",
            record.source or "", record.email or "", record.phone or "",
            record.score if record.score is not None else "",
            float(record.value) if record.value is not None else "",
            record.created_at.isoformat() if record.created_at else "",
        ]
    if entity == "contact":
        return [
            str(record.id), record.first_name, record.last_name,
            record.email or "", record.phone or "", record.title or "",
            record.status, record.created_at.isoformat() if record.created_at else "",
        ]
    if entity == "deal":
        return [
            str(record.id), record.name, record.stage.value if record.stage else "",
            float(record.amount) if record.amount is not None else "",
            record.currency, record.probability if record.probability is not None else "",
            record.close_date.isoformat() if record.close_date else "",
            record.created_at.isoformat() if record.created_at else "",
        ]
    if entity == "task":
        return [
            str(record.id), record.title, record.status.value if record.status else "",
            record.priority.value if record.priority else "",
            record.due_date.isoformat() if record.due_date else "",
            record.description or "",
            record.created_at.isoformat() if record.created_at else "",
        ]
    if entity == "note":
        return [
            str(record.id), record.related_type, str(record.related_id),
            record.body, record.created_at.isoformat() if record.created_at else "",
        ]
    return [str(record)]


async def sync_entity_to_sheet(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    entity: str,
    spreadsheet_id: str,
    record: Any,
) -> dict[str, Any]:
    """Append a single CRM record as a row to the appropriate tab."""
    account = await _get_sheets_account(db, user_id)
    if account is None:
        raise ValueError("Google Sheets is not connected")

    if entity not in ENTITY_HEADERS:
        raise ValueError(f"Unsupported entity for Sheets sync: {entity}")

    access_token = await refresh_google_token(account)
    tab = ENTITY_TAB[entity]
    headers = ENTITY_HEADERS[entity]
    await _ensure_tab_and_headers(access_token, spreadsheet_id, tab, headers)
    result = await _append_row(access_token, spreadsheet_id, f"{tab}!A1", [_row_for(entity, record)])

    audit = IntegrationAuditLog(
        user_id=user_id,
        action="sheets_sync",
        details={"entity": entity, "tab": tab, "spreadsheet_id": spreadsheet_id, "record_id": str(getattr(record, "id", ""))},
    )
    db.add(audit)
    await db.flush()
    return {"success": True, "entity": entity, "tab": tab, "sheets_response": result}


async def sync_all_entity_to_sheet(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    entity: str,
    spreadsheet_id: str,
    limit: int = 500,
) -> dict[str, Any]:
    """Bulk-append all records of an entity to its tab."""
    if entity == "lead":
        rows = (await db.execute(select(Lead).where(Lead.user_id == user_id).limit(limit))).scalars().all()
    elif entity == "contact":
        rows = (await db.execute(select(Contact).where(Contact.user_id == user_id).limit(limit))).scalars().all()
    elif entity == "deal":
        rows = (await db.execute(select(Deal).where(Deal.user_id == user_id).limit(limit))).scalars().all()
    elif entity == "task":
        rows = (await db.execute(select(Task).where(Task.user_id == user_id).limit(limit))).scalars().all()
    elif entity == "note":
        rows = (await db.execute(select(Note).where(Note.user_id == user_id).limit(limit))).scalars().all()
    else:
        raise ValueError(f"Unsupported entity: {entity}")

    if not rows:
        return {"success": True, "entity": entity, "appended": 0}

    account = await _get_sheets_account(db, user_id)
    if account is None:
        raise ValueError("Google Sheets is not connected")

    access_token = await refresh_google_token(account)
    tab = ENTITY_TAB[entity]
    headers = ENTITY_HEADERS[entity]
    await _ensure_tab_and_headers(access_token, spreadsheet_id, tab, headers)
    values = [_row_for(entity, r) for r in rows]
    result = await _append_row(access_token, spreadsheet_id, f"{tab}!A1", values)
    return {"success": True, "entity": entity, "appended": len(values), "sheets_response": result}
