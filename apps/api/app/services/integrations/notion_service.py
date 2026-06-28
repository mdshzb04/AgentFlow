"""Notion API integration service."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


class NotionServiceError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class NotionService:
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{NOTION_API_BASE}{path}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                method, url, headers=self._headers(), json=json, params=params
            )
            if resp.status_code >= 400:
                detail = resp.text[:300]
                logger.error("Notion API error %s %s: %s", method, path, detail)
                raise NotionServiceError(
                    f"Notion API error ({resp.status_code}): {detail}",
                    status_code=resp.status_code,
                )
            if resp.status_code == 204:
                return {}
            return resp.json()

    async def test_connection(self) -> dict[str, Any]:
        try:
            data = await self._request("GET", "/users/me")
            workspace_name = (
                data.get("bot", {}).get("workspace_name")
                or data.get("name")
                or "Notion Workspace"
            )
            return {
                "healthy": True,
                "message": "Connected",
                "workspace_name": workspace_name,
                "user_id": data.get("id"),
            }
        except NotionServiceError as exc:
            return {"healthy": False, "message": str(exc), "workspace_name": None}
        except Exception as exc:
            return {"healthy": False, "message": str(exc), "workspace_name": None}

    async def create_page(
        self,
        *,
        parent_id: str,
        title: str,
        content: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "parent": {"page_id": parent_id},
            "properties": {
                "title": {
                    "title": [{"type": "text", "text": {"content": title[:2000]}}],
                }
            },
        }
        if content:
            body["children"] = [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": content[:2000]}}],
                    },
                }
            ]
        return await self._request("POST", "/pages", json=body)

    async def append_meeting_notes(
        self,
        *,
        page_id: str,
        notes: str,
        heading: str = "Meeting Notes",
    ) -> dict[str, Any]:
        blocks = [
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": heading}}],
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": notes[:2000]}}],
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": f"Synced at {datetime.now(UTC).isoformat()}",
                            },
                        }
                    ],
                },
            },
        ]
        return await self._request("PATCH", f"/blocks/{page_id}/children", json={"children": blocks})

    async def save_ai_summary(
        self,
        *,
        page_id: str,
        summary: str,
        title: str = "AI Summary",
    ) -> dict[str, Any]:
        return await self.append_meeting_notes(page_id=page_id, notes=summary, heading=title)

    async def sync_crm_note(
        self,
        *,
        page_id: str,
        note_title: str,
        note_body: str,
        entity_type: str | None = None,
        entity_name: str | None = None,
    ) -> dict[str, Any]:
        header = f"CRM Note: {note_title}"
        if entity_type and entity_name:
            header = f"{header} ({entity_type}: {entity_name})"
        return await self.append_meeting_notes(page_id=page_id, notes=note_body, heading=header)

    async def search_pages(self, query: str = "", page_size: int = 10) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {
            "page_size": page_size,
            "filter": {"value": "page", "property": "object"},
        }
        if query:
            payload["query"] = query
        data = await self._request("POST", "/search", json=payload)
        return data.get("results", [])

    async def search_databases(self, query: str = "", page_size: int = 10) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {
            "page_size": page_size,
            "filter": {"value": "database", "property": "object"},
        }
        if query:
            payload["query"] = query
        data = await self._request("POST", "/search", json=payload)
        return data.get("results", [])

    async def create_database(
        self,
        *,
        parent_page_id: str,
        title: str,
        properties: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a database under a parent page. Default schema: Name (title)."""
        props = properties or {
            "Name": {"title": {}},
        }
        body = {
            "parent": {"page_id": parent_page_id},
            "title": [{"type": "text", "text": {"content": title[:2000]}}],
            "properties": props,
        }
        return await self._request("POST", "/databases", json=body)

    async def query_database(
        self,
        *,
        database_id: str,
        filter_: dict[str, Any] | None = None,
        page_size: int = 20,
    ) -> list[dict[str, Any]]:
        body: dict[str, Any] = {"page_size": min(page_size, 100)}
        if filter_:
            body["filter"] = filter_
        data = await self._request("POST", f"/databases/{database_id}/query", json=body)
        return data.get("results", [])

    async def create_database_item(
        self,
        *,
        database_id: str,
        properties: dict[str, Any],
        content: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"parent": {"database_id": database_id}, "properties": properties}
        if content:
            body["children"] = [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": content[:2000]}}],
                    },
                }
            ]
        return await self._request("POST", "/pages", json=body)

    async def update_database_item(
        self,
        *,
        page_id: str,
        properties: dict[str, Any],
    ) -> dict[str, Any]:
        return await self._request(
            "PATCH", f"/pages/{page_id}", json={"properties": properties}
        )


def get_notion_service(api_key: str) -> NotionService:
    return NotionService(api_key)
