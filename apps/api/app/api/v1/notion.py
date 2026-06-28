"""Notion API routes — API keys never exposed to clients."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.rate_limit import get_client_ip, public_form_rate_limiter
from app.models.integration_platform import ConnectionStatus
from app.schemas.notion import (
    NotionActionResponse,
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
    rows = await connection_service.list_connections(db, user_id, slug="notion")
    active = next((r for r in rows if r[0].status == ConnectionStatus.CONNECTED), None)
    if active is None:
        settings = get_settings()
        if settings.notion_api_key:
            return get_notion_service(settings.notion_api_key), None
        raise HTTPException(status_code=400, detail="Notion is not connected")
    connection, _ = active
    creds = await connection_service.get_credentials(db, connection.id)
    api_key = creds.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Notion credentials missing")
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


def _extract_title(page: dict) -> str:
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            parts = prop.get("title", [])
            return "".join(p.get("plain_text", "") for p in parts) or "Untitled"
    return "Untitled"
