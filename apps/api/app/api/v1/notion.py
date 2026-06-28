"""Notion API routes — API keys never exposed to clients."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import CurrentUser, DbSession
from app.core.rate_limit import get_client_ip, public_form_rate_limiter
from app.schemas.notion import (
    NotionActionResponse,
    NotionDatabaseCreateRequest,
    NotionDatabaseItemRequest,
    NotionDatabaseUpdateItemRequest,
    NotionMeetingNotesRequest,
    NotionPageCreateRequest,
    NotionSummaryRequest,
    NotionSyncNoteRequest,
)
from app.services.integrations.connection_service import connection_service
from app.services.integrations.notion_service import NotionServiceError, get_notion_service

router = APIRouter(prefix="/notion", tags=["notion"])
notion_rate_limiter = public_form_rate_limiter


async def _get_user_notion(db, user_id: uuid.UUID):
    """Resolve the current user's Notion connection. Per-user only — no env fallback."""
    rows = await connection_service.list_connections(db, user_id, slug="notion")
    active = next(
        (r for r in rows if str(r[0].status.value if hasattr(r[0].status, "value") else r[0].status).upper() == "CONNECTED"),
        None,
    )
    if active is None:
        raise HTTPException(
            status_code=400,
            detail="Notion is not connected for this user. Connect it on the Integrations page.",
        )
    connection, _ = active
    creds = await connection_service.get_credentials(db, connection.id)
    api_key = creds.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Notion credentials missing for this connection")
    return get_notion_service(api_key), connection


@router.post("/pages", response_model=NotionActionResponse)
async def create_page(
    body: NotionPageCreateRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.create_page(
            parent_id=body.parent_id, title=body.title, content=body.content
        )
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="Page created")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.post("/meeting-notes", response_model=NotionActionResponse)
async def append_meeting_notes(
    body: NotionMeetingNotesRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.append_meeting_notes(
            page_id=body.page_id, notes=body.notes, heading=body.heading
        )
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="Meeting notes appended")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.post("/summaries", response_model=NotionActionResponse)
async def save_summary(
    body: NotionSummaryRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.save_ai_summary(
            page_id=body.page_id, summary=body.summary, title=body.title
        )
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="Summary saved")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.post("/notes/sync", response_model=NotionActionResponse)
async def sync_crm_note(
    body: NotionSyncNoteRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.sync_crm_note(
            page_id=body.page_id,
            note_title=body.note_title,
            note_body=body.note_body,
            entity_type=body.entity_type,
            entity_name=body.entity_name,
        )
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="CRM note synced")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.get("/pages/search")
async def search_pages(
    current_user: CurrentUser,
    db: DbSession,
    q: str = "",
    limit: int = 10,
) -> dict:
    notion, _ = await _get_user_notion(db, current_user.id)
    try:
        pages = await notion.search_pages(q, page_size=min(limit, 25))
        return {
            "results": [
                {
                    "id": p.get("id"),
                    "title": _extract_title(p),
                    "url": p.get("url"),
                }
                for p in pages
            ]
        }
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.get("/databases/search")
async def search_databases(
    current_user: CurrentUser,
    db: DbSession,
    q: str = "",
    limit: int = 10,
) -> dict:
    notion, _ = await _get_user_notion(db, current_user.id)
    try:
        dbs = await notion.search_databases(q, page_size=min(limit, 25))
        return {
            "results": [
                {"id": d.get("id"), "title": _extract_db_title(d), "url": d.get("url")}
                for d in dbs
            ]
        }
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.post("/databases", response_model=NotionActionResponse)
async def create_database(
    body: NotionDatabaseCreateRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.create_database(
            parent_page_id=body.parent_page_id,
            title=body.title,
            properties=body.properties,
        )
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="Database created")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.post("/databases/{database_id}/items", response_model=NotionActionResponse)
async def create_database_item(
    database_id: str,
    body: NotionDatabaseItemRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.create_database_item(
            database_id=database_id,
            properties=body.properties,
            content=body.content,
        )
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="Database item created")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.patch("/pages/{page_id}", response_model=NotionActionResponse)
async def update_database_item(
    page_id: str,
    body: NotionDatabaseUpdateItemRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> NotionActionResponse:
    notion_rate_limiter.check(f"notion:{current_user.id}:{get_client_ip(request)}")
    notion, connection = await _get_user_notion(db, current_user.id)
    try:
        result = await notion.update_database_item(page_id=page_id, properties=body.properties)
        if connection:
            connection.last_sync_at = datetime.now(UTC)
            await db.flush()
        return NotionActionResponse(success=True, notion_response=result, message="Page updated")
    except NotionServiceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


def _extract_db_title(db: dict) -> str:
    titles = db.get("title", [])
    return "".join(t.get("plain_text", "") for t in titles) or "Untitled"


def _extract_title(page: dict) -> str:
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            parts = prop.get("title", [])
            return "".join(p.get("plain_text", "") for p in parts) or "Untitled"
    return "Untitled"
