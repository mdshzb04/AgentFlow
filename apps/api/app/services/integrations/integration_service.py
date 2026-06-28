"""Unified integration catalog and status for dashboard cards."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration_platform import (
    ConnectionStatus,
    Integration,
    IntegrationConnection,
    WebhookEndpoint,
    WorkflowImport,
)
from app.core.config import get_settings
from app.services.integrations.connection_service import connection_service
from app.services.integrations.integration_metrics import all_metrics
from app.services.ai.openai_service import openai_service

PROVIDER_CARDS = [
    {"slug": "openai", "name": "OpenAI", "description": "Chat, summaries, speech, and CRM AI", "auth_type": "platform"},
    {"slug": "notion", "name": "Notion", "description": "Two-way CRM sync to a Notion database — every create or update in AgentFlow is mirrored to Notion", "auth_type": "api_key"},
    {"slug": "gmail", "name": "Gmail", "description": "Send and read emails", "auth_type": "oauth"},
    {
        "slug": "google_sheets",
        "name": "Google Sheets",
        "description": "Real-time CRM sync to a Google Sheet — every lead, contact, company, deal, task, and note is mirrored to its own tab",
        "auth_type": "oauth",
    },
    {"slug": "n8n", "name": "n8n", "description": "Import and sync automation workflows", "auth_type": "api_key"},
    {"slug": "webhooks", "name": "Webhooks", "description": "Incoming and outgoing HTTP webhooks", "auth_type": "secret"},
]

OAUTH_CONNECT_PATHS = {
    "gmail": "/api/v1/integrations/gmail/connect",
    "google_sheets": "/api/v1/integrations/google-sheets/connect",
}


def _oauth_connect_available(slug: str) -> bool:
    settings = get_settings()
    if slug in ("gmail", "google_sheets"):
        return bool(settings.google_client_id and settings.google_client_secret)
    return False


class IntegrationService:
    async def list_provider_cards(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> list[dict[str, Any]]:
        connections = await connection_service.list_connections(db, user_id)
        by_slug: dict[str, list[tuple[IntegrationConnection, Integration]]] = {}
        for conn, integration in connections:
            by_slug.setdefault(integration.slug, []).append((conn, integration))

        # Compute live metrics once and slice per slug.
        metrics = await all_metrics(db, user_id)

        cards: list[dict[str, Any]] = []
        for meta in PROVIDER_CARDS:
            slug = meta["slug"]
            conn_rows = by_slug.get(slug, [])
            active = next(
                (c for c, _ in conn_rows if c.status == ConnectionStatus.CONNECTED),
                None,
            )
            active_integration = next(
                (i for c, i in conn_rows if c.status == ConnectionStatus.CONNECTED),
                None,
            )

            card: dict[str, Any] = {
                "slug": slug,
                "name": meta["name"],
                "description": meta["description"],
                "auth_type": meta["auth_type"],
                "status": ConnectionStatus.DISCONNECTED.value,
                "health_status": "unknown",
                "connection_id": None,
                "account_email": None,
                "display_name": None,
                "last_sync_at": None,
                "last_error": None,
                "connect_url": OAUTH_CONNECT_PATHS.get(slug)
                if _oauth_connect_available(slug)
                else None,
                "settings": {},
                "metrics": metrics.get(slug, {}),
            }

            if slug == "openai":
                if openai_service.is_configured:
                    health = openai_service._last_health or {}
                    has_run = bool(openai_service._last_health)
                    healthy = bool(health.get("healthy"))
                    card.update(
                        {
                            "status": ConnectionStatus.CONNECTED.value,
                            "health_status": "healthy" if (has_run and healthy) else ("error" if has_run else "unknown"),
                            "display_name": "OpenAI",
                            "last_error": None if healthy else health.get("message"),
                            "settings": {
                                "model": health.get("model"),
                                "features": ["chat", "structured_output", "stt", "tts", "crm_insights"],
                            },
                        }
                    )
                cards.append(card)
                continue

            if active and active_integration:
                card.update(
                    {
                        "status": ConnectionStatus.CONNECTED.value,
                        "health_status": active.health_status,
                        "connection_id": str(active.id),
                        "account_email": active.account_email,
                        "display_name": active.display_name,
                        "last_sync_at": active.last_sync_at.isoformat() if active.last_sync_at else None,
                        "last_error": active.last_error,
                    }
                )
                if slug == "n8n":
                    imports = await connection_service.count_workflow_imports(db, active.id)
                    card["settings"] = {
                        "instance_url": active.connection_metadata.get("base_url") or active.external_id,
                        "version": active.connection_metadata.get("version"),
                        "workflows_imported": imports,
                    }
                if slug == "webhooks":
                    count = await self._count_webhooks(db, user_id)
                    card["settings"] = {"endpoint_count": count}
                if slug == "notion":
                    card["settings"] = {
                        "workspace_name": active.connection_metadata.get("workspace_name"),
                    }

            cards.append(card)
        return cards

    async def get_status_summary(self, db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
        cards = await self.list_provider_cards(db, user_id)
        connected = sum(1 for c in cards if c["status"] == "connected")
        unhealthy = sum(
            1 for c in cards if c["status"] == "connected" and c["health_status"] == "error"
        )
        return {
            "total_providers": len(cards),
            "connected": connected,
            "disconnected": len(cards) - connected,
            "unhealthy": unhealthy,
            "providers": cards,
        }

    async def get_connection_detail(
        self,
        db: AsyncSession,
        connection_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        row = await connection_service.get_connection(db, connection_id, user_id)
        if row is None:
            return None
        connection, integration = row
        detail: dict[str, Any] = {
            "id": str(connection.id),
            "slug": integration.slug,
            "name": integration.name,
            "display_name": connection.display_name,
            "status": connection.status.value,
            "health_status": connection.health_status,
            "account_email": connection.account_email,
            "external_id": connection.external_id,
            "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
            "last_error": connection.last_error,
            "metadata": {
                k: v for k, v in connection.connection_metadata.items() if k != "api_key"
            },
            "has_api_key": integration.slug == "n8n",
            "api_key_masked": True,
        }
        if integration.slug == "n8n":
            detail["instance_url"] = connection.connection_metadata.get("base_url") or connection.external_id
            detail["version"] = connection.connection_metadata.get("version")
            detail["workflows_imported"] = await connection_service.count_workflow_imports(
                db, connection.id
            )
        return detail

    async def _count_webhooks(self, db: AsyncSession, user_id: uuid.UUID) -> int:
        result = await db.execute(
            select(func.count())
            .select_from(WebhookEndpoint)
            .where(WebhookEndpoint.user_id == user_id, WebhookEndpoint.is_active.is_(True))
        )
        return int(result.scalar_one())


integration_service = IntegrationService()
