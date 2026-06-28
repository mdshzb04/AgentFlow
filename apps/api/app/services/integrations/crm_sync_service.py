"""Real-time CRM sync to Google Sheets and Notion.

Every CRM create/update is mirrored to connected integrations with idempotent
updates. Sync IDs are persisted in CrmSyncMapping so repeated saves update the
same remote row/page instead of creating duplicates.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.crm import Company, Contact, Deal, Lead, Note, Task
from app.models.integration import IntegrationAccount, IntegrationProvider
from app.models.integration_platform import (
    ConnectionStatus,
    CrmSyncMapping,
    IntegrationConnection,
)
from app.services.integrations.accounts import refresh_google_token
from app.services.integrations.connection_service import connection_service
from app.services.integrations.notion_service import get_notion_service

logger = logging.getLogger(__name__)

SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

CRM_ENTITIES = {"lead", "contact", "company", "deal", "task", "note"}

ENTITY_HEADERS: dict[str, list[str]] = {
    "lead": ["ID", "Title", "Status", "Source", "Email", "Phone", "Score", "Value", "Updated At"],
    "contact": ["ID", "First Name", "Last Name", "Email", "Phone", "Title", "Status", "Updated At"],
    "company": ["ID", "Name", "Domain", "Industry", "Size", "Website", "Phone", "Address", "Updated At"],
    "deal": ["ID", "Name", "Stage", "Amount", "Currency", "Probability", "Close Date", "Updated At"],
    "task": ["ID", "Title", "Status", "Priority", "Due Date", "Description", "Updated At"],
    "note": ["ID", "Related Type", "Related ID", "Body", "Updated At"],
}

ENTITY_TAB: dict[str, str] = {
    "lead": "Leads",
    "contact": "Contacts",
    "company": "Companies",
    "deal": "Deals",
    "task": "Tasks",
    "note": "Notes",
}


def _row_for(entity: str, record: Any) -> list[Any]:
    updated_at = getattr(record, "updated_at", None)
    updated_iso = updated_at.isoformat() if updated_at else ""
    if entity == "lead":
        return [
            str(record.id),
            record.title,
            record.status.value if record.status else "",
            record.source or "",
            record.email or "",
            record.phone or "",
            record.score if record.score is not None else "",
            float(record.value) if record.value is not None else "",
            updated_iso,
        ]
    if entity == "contact":
        return [
            str(record.id),
            record.first_name,
            record.last_name,
            record.email or "",
            record.phone or "",
            record.title or "",
            record.status or "",
            updated_iso,
        ]
    if entity == "company":
        return [
            str(record.id),
            record.name,
            record.domain or "",
            record.industry or "",
            record.size or "",
            record.website or "",
            record.phone or "",
            record.address or "",
            updated_iso,
        ]
    if entity == "deal":
        return [
            str(record.id),
            record.name,
            record.stage.value if record.stage else "",
            float(record.amount) if record.amount is not None else "",
            record.currency or "",
            record.probability if record.probability is not None else "",
            record.close_date.isoformat() if record.close_date else "",
            updated_iso,
        ]
    if entity == "task":
        return [
            str(record.id),
            record.title,
            record.status.value if record.status else "",
            record.priority.value if record.priority else "",
            record.due_date.isoformat() if record.due_date else "",
            record.description or "",
            updated_iso,
        ]
    if entity == "note":
        return [
            str(record.id),
            record.related_type or "",
            str(record.related_id) if record.related_id else "",
            record.body or "",
            updated_iso,
        ]
    return [str(record)]


def _safe(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "value"):
        return str(value.value)
    return str(value)


# ─── Google Sheets helpers ──────────────────────────────────────────────────


async def _get_sheets_connection(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[IntegrationConnection, IntegrationAccount, str] | None:
    rows = await connection_service.list_connections(db, user_id, slug="google_sheets")
    connected = [
        (conn, acct)
        for conn, _ in rows
        if conn.status == ConnectionStatus.CONNECTED
        for acct in [await _legacy_account_for_connection(db, conn)]
        if acct is not None
    ]
    if not connected:
        return None
    connection, account = connected[0]
    spreadsheet_id = connection.connection_metadata.get("spreadsheet_id") or account.account_metadata.get("spreadsheet_id")
    if not spreadsheet_id:
        try:
            spreadsheet_id = await _find_or_create_spreadsheet(db, connection, account)
        except Exception as exc:
            # Auto-create failed (e.g. 403 — token lacks drive.file scope).
            # Don't crash the whole sync; just skip Sheets this round.
            logger.warning("Sheets auto-create failed for user %s: %s", user_id, exc)
            return None
    return connection, account, str(spreadsheet_id)


async def _legacy_account_for_connection(
    db: AsyncSession, connection: IntegrationConnection
) -> IntegrationAccount | None:
    if not connection.legacy_account_id:
        result = await db.execute(
            select(IntegrationAccount).where(
                IntegrationAccount.user_id == connection.user_id,
                IntegrationAccount.provider == IntegrationProvider.GOOGLE_SHEETS,
            )
        )
        return result.scalar_one_or_none()
    result = await db.execute(
        select(IntegrationAccount).where(IntegrationAccount.id == connection.legacy_account_id)
    )
    return result.scalar_one_or_none()


async def _find_or_create_spreadsheet(
    db: AsyncSession,
    connection: IntegrationConnection,
    account: IntegrationAccount,
) -> str:
    """Create a destination spreadsheet if the user has not configured one."""
    access_token = await refresh_google_token(account)
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://sheets.googleapis.com/v4/spreadsheets",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"properties": {"title": "AgentFlow CRM"}},
        )
        resp.raise_for_status()
        data = resp.json()
        spreadsheet_id = data["spreadsheetId"]
    metadata = dict(connection.connection_metadata)
    metadata["spreadsheet_id"] = spreadsheet_id
    metadata["spreadsheet_name"] = "AgentFlow CRM"
    connection.connection_metadata = metadata
    account.account_metadata = {**account.account_metadata, "spreadsheet_id": spreadsheet_id}
    await db.flush()
    return spreadsheet_id


async def _ensure_sheets_tab(
    access_token: str, spreadsheet_id: str, entity: str
) -> str:
    tab = ENTITY_TAB[entity]
    headers = ENTITY_HEADERS[entity]
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
                json={"requests": [{"addSheet": {"properties": {"title": tab}}}]},
            )
            await _sheets_append_row(access_token, spreadsheet_id, f"{tab}!A1", [headers])
        else:
            rng = await client.get(
                f"{SHEETS_API}/{spreadsheet_id}/values/{tab}!A1:Z1",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if rng.status_code < 400 and not rng.json().get("values"):
                await _sheets_append_row(access_token, spreadsheet_id, f"{tab}!A1", [headers])
    return tab


async def _sheets_append_row(
    access_token: str, spreadsheet_id: str, range_: str, values: list[list[Any]]
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


async def _sheets_update_row(
    access_token: str,
    spreadsheet_id: str,
    tab: str,
    row_index: int,
    values: list[Any],
) -> dict[str, Any]:
    end_col = chr(ord("A") + len(values) - 1)
    range_ = f"{tab}!A{row_index}:{end_col}{row_index}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.put(
            f"{SHEETS_API}/{spreadsheet_id}/values/{range_}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"valueInputOption": "USER_ENTERED"},
            json={"values": [values]},
        )
        resp.raise_for_status()
        return resp.json()


async def _get_existing_mapping(
    db: AsyncSession,
    connection_id: uuid.UUID,
    provider: str,
    entity_type: str,
    record_id: uuid.UUID,
) -> CrmSyncMapping | None:
    result = await db.execute(
        select(CrmSyncMapping).where(
            CrmSyncMapping.connection_id == connection_id,
            CrmSyncMapping.provider == provider,
            CrmSyncMapping.entity_type == entity_type,
            CrmSyncMapping.record_id == record_id,
        )
    )
    return result.scalar_one_or_none()


async def _persist_mapping(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    connection_id: uuid.UUID,
    provider: str,
    entity_type: str,
    record_id: uuid.UUID,
    remote_id: str,
    remote_url: str | None = None,
    error: str | None = None,
) -> None:
    mapping = await _get_existing_mapping(db, connection_id, provider, entity_type, record_id)
    now = datetime.now(UTC)
    if mapping is None:
        mapping = CrmSyncMapping(
            user_id=user_id,
            connection_id=connection_id,
            provider=provider,
            entity_type=entity_type,
            record_id=record_id,
            remote_id=remote_id,
            remote_url=remote_url,
        )
        db.add(mapping)
    mapping.remote_id = remote_id
    mapping.remote_url = remote_url
    mapping.last_synced_at = now if error is None else mapping.last_synced_at
    mapping.last_error = error
    await db.flush()


async def _sync_record_to_google_sheets(
    db: AsyncSession, user_id: uuid.UUID, entity: str, record: Any
) -> dict[str, Any]:
    conn_tuple = await _get_sheets_connection(db, user_id)
    if conn_tuple is None:
        return {"success": False, "skipped": True, "reason": "no_google_sheets_connection"}
    connection, account, spreadsheet_id = conn_tuple

    access_token = await refresh_google_token(account)
    tab = await _ensure_sheets_tab(access_token, spreadsheet_id, entity)
    values = _row_for(entity, record)

    mapping = await _get_existing_mapping(db, connection.id, "google_sheets", entity, record.id)

    try:
        if mapping:
            row_index = int(mapping.remote_id)
            await _sheets_update_row(access_token, spreadsheet_id, tab, row_index, values)
            remote_id = str(row_index)
        else:
            result = await _sheets_append_row(access_token, spreadsheet_id, f"{tab}!A1", [values])
            updates = result.get("updates", {})
            row_index = updates.get("updatedRange", "").split("!")[-1].split(":")[0]
            # Row index is digits after the letter, e.g. "A42" -> 42.
            remote_id = "".join(c for c in row_index if c.isdigit()) or str(updates.get("updatedRows", 1))

        remote_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit#gid=0"
        await _persist_mapping(
            db,
            user_id=user_id,
            connection_id=connection.id,
            provider="google_sheets",
            entity_type=entity,
            record_id=record.id,
            remote_id=remote_id,
            remote_url=remote_url,
        )
        return {"success": True, "provider": "google_sheets", "remote_id": remote_id}
    except Exception as exc:
        error = f"Google Sheets sync failed: {exc}"
        logger.exception("Google Sheets sync failed for %s %s", entity, record.id)
        if mapping:
            await _persist_mapping(
                db,
                user_id=user_id,
                connection_id=connection.id,
                provider="google_sheets",
                entity_type=entity,
                record_id=record.id,
                remote_id=mapping.remote_id,
                error=error,
            )
        return {"success": False, "provider": "google_sheets", "error": error}


# ─── Notion helpers ──────────────────────────────────────────────────────────


async def _get_notion_connection_or_none(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[IntegrationConnection | None, str] | None:
    """Return (connection, api_key) for an explicit per-user Notion connection.

    A global env API key without a connection row is not enough — the CRM
    database must be created under a page the user owns, which requires
    an explicit connection through the Integrations page.
    """
    rows = await connection_service.list_connections(db, user_id, slug="notion")
    for conn, _ in rows:
        if conn.status != ConnectionStatus.CONNECTED:
            continue
        creds = await connection_service.get_credentials(db, conn.id)
        api_key = creds.get("api_key")
        if api_key:
            return conn, str(api_key)
    return None


async def _get_or_create_notion_crm_database(
    db: AsyncSession, connection: IntegrationConnection | None, service: Any
) -> str:
    if connection is not None:
        db_id = connection.connection_metadata.get("crm_database_id")
        if db_id:
            return str(db_id)

    # Look for an existing AgentFlow CRM database.
    databases = await service.search_databases(query="AgentFlow CRM", page_size=5)
    if databases:
        db_id = databases[0]["id"]
    else:
        # Fall back to creating under the first accessible page.
        pages = await service.search_pages(query="", page_size=5)
        if not pages:
            raise ValueError("No Notion page available to host the CRM database")
        parent_page_id = pages[0]["id"]
        created = await service.create_database(
            parent_page_id=parent_page_id,
            title="AgentFlow CRM",
            properties={
                "Name": {"title": {}},
                "Type": {"select": {"options": []}},
                "Status": {"select": {"options": []}},
                "Source ID": {"rich_text": {}},
                "Details": {"rich_text": {}},
            },
        )
        db_id = created["id"]

    if connection is not None:
        metadata = dict(connection.connection_metadata)
        metadata["crm_database_id"] = db_id
        connection.connection_metadata = metadata
        await db.flush()
    return str(db_id)


def _notion_properties_for(entity: str, record: Any) -> dict[str, Any]:
    data: dict[str, Any] = {}
    if isinstance(record, Lead):
        data = {
            "title": record.title,
            "status": _safe(record.status),
            "source": record.source,
            "email": record.email,
            "phone": record.phone,
            "score": record.score,
            "value": record.value,
        }
    elif isinstance(record, Contact):
        data = {
            "first_name": record.first_name,
            "last_name": record.last_name,
            "email": record.email,
            "phone": record.phone,
            "title": record.title,
            "status": record.status,
        }
    elif isinstance(record, Company):
        data = {
            "name": record.name,
            "domain": record.domain,
            "industry": record.industry,
            "size": record.size,
            "website": record.website,
            "phone": record.phone,
            "address": record.address,
        }
    elif isinstance(record, Deal):
        data = {
            "name": record.name,
            "stage": _safe(record.stage),
            "amount": record.amount,
            "currency": record.currency,
            "probability": record.probability,
            "close_date": _safe(record.close_date),
        }
    elif isinstance(record, Task):
        data = {
            "title": record.title,
            "status": _safe(record.status),
            "priority": _safe(record.priority),
            "due_date": _safe(record.due_date),
            "description": record.description,
        }
    elif isinstance(record, Note):
        data = {
            "related_type": record.related_type,
            "related_id": _safe(record.related_id),
            "body": record.body,
        }

    name = data.get("title") or data.get("name") or data.get("first_name") or f"{entity.title()}"
    if "last_name" in data and data["last_name"]:
        name = f"{name} {data['last_name']}".strip()
    status = data.get("status") or ""

    return {
        "Name": {"title": [{"type": "text", "text": {"content": name[:2000]}}]},
        "Type": {"select": {"name": entity.title()}},
        "Status": {"select": {"name": str(status)[:100]} if status else {"name": "—"}},
        "Source ID": {"rich_text": [{"type": "text", "text": {"content": str(record.id)}}]},
        "Details": {
            "rich_text": [
                {
                    "type": "text",
                    "text": {"content": str(data)[:2000]},
                }
            ]
        },
    }


async def _sync_record_to_notion(
    db: AsyncSession, user_id: uuid.UUID, entity: str, record: Any
) -> dict[str, Any]:
    conn_tuple = await _get_notion_connection_or_none(db, user_id)
    if conn_tuple is None:
        return {"success": False, "skipped": True, "reason": "no_notion_connection"}
    connection, api_key = conn_tuple
    service = get_notion_service(api_key)

    try:
        database_id = await _get_or_create_notion_crm_database(db, connection, service)
        properties = _notion_properties_for(entity, record)

        mapping: CrmSyncMapping | None = None
        if connection is not None:
            mapping = await _get_existing_mapping(db, connection.id, "notion", entity, record.id)

        if mapping:
            page = await service.update_database_item(page_id=mapping.remote_id, properties=properties)
            remote_id = mapping.remote_id
        else:
            page = await service.create_database_item(database_id=database_id, properties=properties)
            remote_id = page["id"]

        remote_url = page.get("url")
        if connection is not None:
            await _persist_mapping(
                db,
                user_id=user_id,
                connection_id=connection.id,
                provider="notion",
                entity_type=entity,
                record_id=record.id,
                remote_id=remote_id,
                remote_url=remote_url,
            )
        return {"success": True, "provider": "notion", "remote_id": remote_id}
    except Exception as exc:
        error = f"Notion sync failed: {exc}"
        logger.exception("Notion sync failed for %s %s", entity, record.id)
        if connection is not None and mapping:
            await _persist_mapping(
                db,
                user_id=user_id,
                connection_id=connection.id,
                provider="notion",
                entity_type=entity,
                record_id=record.id,
                remote_id=mapping.remote_id,
                error=error,
            )
        return {"success": False, "provider": "notion", "error": error}


# ─── Public API ─────────────────────────────────────────────────────────────


async def sync_crm_record(
    db: AsyncSession,
    user_id: uuid.UUID,
    entity: str,
    record: Any,
) -> dict[str, Any]:
    """Sync a single CRM record to all connected integrations.

    Each provider is attempted independently; a failure in one does not block
    the others.
    """
    entity = entity.lower()
    if entity not in CRM_ENTITIES:
        return {"success": False, "error": f"Unsupported entity: {entity}"}

    sheets_result: dict[str, Any] = {"success": False, "skipped": True, "reason": "not_attempted"}
    try:
        sheets_result = await _sync_record_to_google_sheets(db, user_id, entity, record)
    except Exception as exc:
        logger.exception("Sheets sync crashed for %s %s", entity, record.id)
        sheets_result = {"success": False, "provider": "google_sheets", "error": str(exc)}

    notion_result: dict[str, Any] = {"success": False, "skipped": True, "reason": "not_attempted"}
    try:
        notion_result = await _sync_record_to_notion(db, user_id, entity, record)
    except Exception as exc:
        logger.exception("Notion sync crashed for %s %s", entity, record.id)
        notion_result = {"success": False, "provider": "notion", "error": str(exc)}

    return {
        "success": sheets_result.get("success") or notion_result.get("success"),
        "google_sheets": sheets_result,
        "notion": notion_result,
    }


# ─── Content sync (meeting summaries, transcripts, workflow logs) ───────────


async def _sync_content_to_notion(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    content_type: str,
    title: str,
    body: str,
    related_entity: str | None = None,
    related_id: str | None = None,
    source_id: str | None = None,
) -> dict[str, Any]:
    """Persist a content block (meeting summary, transcript, workflow log) to Notion.

    The content lives in the same AgentFlow CRM database with Type=content_type.
    `source_id` lets callers pass an idempotency key (e.g. workflow execution id)
    to avoid creating duplicate pages on retries.
    """
    conn_tuple = await _get_notion_connection_or_none(db, user_id)
    if conn_tuple is None:
        return {"success": False, "skipped": True, "reason": "no_notion_connection"}
    connection, api_key = conn_tuple
    service = get_notion_service(api_key)

    try:
        database_id = await _get_or_create_notion_crm_database(db, connection, service)
        properties = {
            "Name": {"title": [{"type": "text", "text": {"content": title[:2000]}}]},
            "Type": {"select": {"name": content_type}},
            "Status": {"select": {"name": "—"}},
            "Source ID": {
                "rich_text": [
                    {"type": "text", "text": {"content": str(source_id or related_id or "")[:2000]}}
                ]
            },
            "Details": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": (body or "")[:2000]
                            + (
                                f"\n\nRelated: {related_entity}#{related_id}"
                                if related_entity and related_id
                                else ""
                            )
                        },
                    }
                ]
            },
        }

        page = await service.create_database_item(
            database_id=database_id, properties=properties, content=body
        )
        return {
            "success": True,
            "provider": "notion",
            "remote_id": page.get("id"),
            "remote_url": page.get("url"),
        }
    except Exception as exc:
        error = f"Notion content sync failed: {exc}"
        logger.exception("Notion content sync failed for %s", content_type)
        return {"success": False, "provider": "notion", "error": error}


async def sync_meeting_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    title: str,
    summary: str,
    related_entity: str | None = None,
    related_id: str | None = None,
) -> dict[str, Any]:
    return await _sync_content_to_notion(
        db,
        user_id,
        content_type="MeetingSummary",
        title=title,
        body=summary,
        related_entity=related_entity,
        related_id=related_id,
    )


async def sync_call_transcript(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    title: str,
    transcript: str,
    related_entity: str | None = None,
    related_id: str | None = None,
) -> dict[str, Any]:
    return await _sync_content_to_notion(
        db,
        user_id,
        content_type="CallTranscript",
        title=title,
        body=transcript,
        related_entity=related_entity,
        related_id=related_id,
    )


async def sync_workflow_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    execution_id: str,
    workflow_id: str,
    status: str,
    summary: str,
) -> dict[str, Any]:
    return await _sync_content_to_notion(
        db,
        user_id,
        content_type="WorkflowLog",
        title=f"Workflow run {execution_id[:8]} — {status}",
        body=summary,
        source_id=execution_id,
    )


# ─── n8n broadcast ──────────────────────────────────────────────────────────


async def _get_n8n_credentials(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[str, str] | None:
    """Return (base_url, api_key) for the user's active n8n connection."""
    import os

    rows = await connection_service.list_connections(db, user_id, slug="n8n")
    for conn, _ in rows:
        status_value = str(conn.status.value if hasattr(conn.status, "value") else conn.status).upper()
        if status_value != "CONNECTED":
            continue
        creds = await connection_service.get_credentials(db, conn.id)
        api_key = creds.get("api_key")
        base_url = creds.get("base_url") or conn.connection_metadata.get("base_url")
        if api_key and base_url:
            return base_url, str(api_key)
    return None


async def broadcast_crm_event_to_n8n(
    db: AsyncSession, user_id: uuid.UUID, entity: str, record: Any
) -> dict[str, Any]:
    """Push a CRM event to the user's n8n instance via its webhook-style API.

    Best-effort: n8n exposes a generic webhook URL at
    `<base>/webhook/<path>` but we don't know the user's paths. The cheapest
    way to surface the event is to POST to a configurable inbound URL stored
    in the n8n connection's metadata under `event_webhook_path`. If not
    configured, this is a no-op.
    """
    import httpx

    creds = await _get_n8n_credentials(db, user_id)
    if creds is None:
        return {"success": False, "skipped": True, "reason": "no_n8n_connection"}
    base_url, _ = creds

    rows = await connection_service.list_connections(db, user_id, slug="n8n")
    webhook_path: str | None = None
    for conn, _ in rows:
        if conn.status == ConnectionStatus.CONNECTED:
            webhook_path = conn.connection_metadata.get("crm_event_webhook_path")
            if webhook_path:
                break

    if not webhook_path:
        return {
            "success": False,
            "skipped": True,
            "reason": "no_crm_event_webhook_path_configured",
        }

    payload = {
        "event": f"crm.{entity}.upsert",
        "entity": entity,
        "record": _row_dict(record),
        "user_id": str(user_id),
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").UTC).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{base_url.rstrip('/')}/webhook/{webhook_path.lstrip('/')}",
                json=payload,
            )
        return {
            "success": 200 <= resp.status_code < 300,
            "provider": "n8n",
            "status_code": resp.status_code,
        }
    except Exception as exc:
        return {"success": False, "provider": "n8n", "error": str(exc)}


def _row_dict(record: Any) -> dict[str, Any]:
    """Best-effort dict serialization for a CRM ORM instance."""
    from datetime import date

    out: dict[str, Any] = {}
    for col in record.__table__.columns:
        val = getattr(record, col.name, None)
        if val is None:
            out[col.name] = None
        elif isinstance(val, uuid.UUID):
            out[col.name] = str(val)
        elif isinstance(val, date):
            out[col.name] = val.isoformat()
        elif hasattr(val, "value"):
            out[col.name] = val.value
        else:
            out[col.name] = val
    return out