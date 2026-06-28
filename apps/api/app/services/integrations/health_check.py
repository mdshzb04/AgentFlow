"""Connection health checks."""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration_platform import Integration, IntegrationConnection
from app.services.integrations.connection_service import connection_service


class HealthCheckService:
    async def test_connection(
        self, db: AsyncSession, connection: IntegrationConnection, integration: Integration
    ) -> dict:
        slug = integration.slug
        creds = await connection_service.get_credentials(db, connection.id)

        if slug == "n8n":
            from app.services.integrations.n8n_url import resolve_n8n_base_url

            base_url = connection.connection_metadata.get("base_url") or connection.external_id
            api_key = creds.get("api_key", "")
            if not base_url or not api_key:
                return {"healthy": False, "message": "Missing base URL or API key"}
            base_url = resolve_n8n_base_url(str(base_url).rstrip("/"))
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    resp = await client.get(
                        f"{base_url}/api/v1/workflows",
                        headers={"X-N8N-API-KEY": api_key},
                        params={"limit": 1},
                    )
                    if resp.status_code == 401:
                        return {"healthy": False, "message": "Invalid API key"}
                    if resp.status_code >= 400:
                        return {"healthy": False, "message": f"n8n returned {resp.status_code}"}
                    version = resp.headers.get("x-n8n-version", "unknown")
                    return {"healthy": True, "message": "Connected", "version": version}
                except httpx.HTTPError as exc:
                    return {"healthy": False, "message": f"Connection failed: {str(exc)}"}

        if slug in ("gmail", "google_sheets"):
            from app.services.integrations.oauth_service import oauth_service

            token = await oauth_service.get_access_token(db, connection.id)
            if not token:
                return {"healthy": False, "message": "No OAuth token"}
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code >= 400:
                    return {"healthy": False, "message": "Token expired or invalid"}
                return {"healthy": True, "message": "Connected"}

        if slug == "webhooks":
            return {"healthy": True, "message": "Webhook endpoint active"}

        if slug == "notion":
            api_key = creds.get("api_key", "")
            if not api_key:
                return {"healthy": False, "message": "Missing Notion API key"}
            from app.services.integrations.notion_service import get_notion_service

            return await get_notion_service(api_key).test_connection()

        return {"healthy": False, "message": "Unknown provider"}


health_check_service = HealthCheckService()
