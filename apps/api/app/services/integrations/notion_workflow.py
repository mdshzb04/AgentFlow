"""Notion workflow node executor — resolves the user's Notion connection and runs real API calls."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration_platform import ConnectionStatus
from app.services.integrations.connection_service import connection_service
from app.services.integrations.notion_service import NotionService, NotionServiceError, get_notion_service
from app.services.prompt_templates import render_prompt


def _render(value: str, context: dict[str, Any]) -> str:
    flat = {k: str(v) for k, v in context.items()}
    return render_prompt(value, flat)


async def _resolve_notion(db: AsyncSession, user_id: uuid.UUID) -> NotionService:
    """Resolve the current user's Notion connection. Per-user only — no env fallback."""
    rows = await connection_service.list_connections(db, user_id, slug="notion")
    active = next(
        (r for r in rows if str(r[0].status.value if hasattr(r[0].status, "value") else r[0].status).upper() == "CONNECTED"),
        None,
    )
    if active is None:
        raise ValueError("Notion is not connected for this user")
    connection, _ = active
    creds = await connection_service.get_credentials(db, connection.id)
    api_key = creds.get("api_key")
    if not api_key:
        raise ValueError("Notion credentials missing for this connection")
    return get_notion_service(api_key)


async def execute_notion_node(
    db: AsyncSession,
    user_id: uuid.UUID,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    action = config.get("action", "create_page")
    notion = await _resolve_notion(db, user_id)

    try:
        if action == "create_page":
            result = await notion.create_page(
                parent_id=_render(config.get("parentId", ""), context),
                title=_render(config.get("title", "AgentFlow Page"), context),
                content=_render(config.get("content", ""), context) or None,
            )
        elif action == "meeting_notes":
            result = await notion.append_meeting_notes(
                page_id=_render(config.get("pageId", ""), context),
                notes=_render(config.get("notes", ""), context),
                heading=_render(config.get("heading", "Meeting Notes"), context),
            )
        elif action == "ai_summary":
            summary = config.get("summary") or context.get("last_ai_output") or ""
            result = await notion.save_ai_summary(
                page_id=_render(config.get("pageId", ""), context),
                summary=_render(str(summary), context),
                title=_render(config.get("title", "AI Summary"), context),
            )
        elif action == "create_database_item":
            props = config.get("properties") or {}
            rendered_props = {
                _render(k, context): _render_value(v, context) for k, v in props.items()
            }
            result = await notion.create_database_item(
                database_id=_render(config.get("databaseId", ""), context),
                properties=rendered_props,
                content=_render(config.get("content", ""), context) or None,
            )
        elif action == "update_database_item":
            props = config.get("properties") or {}
            rendered_props = {
                _render(k, context): _render_value(v, context) for k, v in props.items()
            }
            result = await notion.update_database_item(
                page_id=_render(config.get("pageId", ""), context),
                properties=rendered_props,
            )
        else:
            raise ValueError(f"Unknown Notion action: {action}")
    except NotionServiceError as exc:
        raise ValueError(str(exc)) from exc

    return {"success": True, "action": action, "notion_response": result}


def _render_value(value: Any, context: dict[str, Any]) -> dict[str, Any]:
    """Build a Notion property value from a plain scalar/dict."""
    if isinstance(value, dict):
        return value
    text = _render(str(value), context)
    return {"title": [{"text": {"content": text[:2000]}}]} if text else {"rich_text": [{"text": {"content": ""}}]}
