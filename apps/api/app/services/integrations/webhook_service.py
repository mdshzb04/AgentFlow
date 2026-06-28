"""Webhook endpoint management, delivery logs, and retries."""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.integration_platform import (
    ConnectionStatus,
    IntegrationConnection,
    WebhookDirection,
    WebhookEndpoint,
    WebhookLog,
    WebhookLogStatus,
)
from app.services.integrations.connection_service import connection_service
from app.services.integrations.webhooks import verify_webhook_secret


class WebhookService:
    async def list_endpoints(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> list[WebhookEndpoint]:
        result = await db.execute(
            select(WebhookEndpoint)
            .where(
                WebhookEndpoint.user_id == user_id,
                WebhookEndpoint.is_active.is_(True),
            )
            .order_by(WebhookEndpoint.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_endpoint(
        self, db: AsyncSession, endpoint_id: uuid.UUID, user_id: uuid.UUID
    ) -> WebhookEndpoint | None:
        result = await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == endpoint_id,
                WebhookEndpoint.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_endpoint_by_token(
        self, db: AsyncSession, url_token: str
    ) -> WebhookEndpoint | None:
        result = await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.url_token == url_token,
                WebhookEndpoint.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def create_incoming(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        name: str,
        workflow_id: uuid.UUID | None = None,
    ) -> tuple[WebhookEndpoint, str]:
        integration = await connection_service.get_integration_by_slug(db, "webhooks")
        if integration is None:
            raise ValueError("Webhooks integration not configured")

        url_token = secrets.token_urlsafe(24)
        secret = connection_service.generate_secret()
        secret_hash = connection_service.hash_secret(secret)

        connection = IntegrationConnection(
            user_id=user_id,
            integration_id=integration.id,
            display_name=name,
            external_id=url_token,
            status=ConnectionStatus.CONNECTED,
            health_status="healthy",
            connection_metadata={
                "webhook_token": url_token,
                "workflow_id": str(workflow_id) if workflow_id else None,
            },
            last_sync_at=datetime.now(UTC),
        )
        db.add(connection)
        await db.flush()

        await connection_service.store_credentials(db, connection.id, {"secret": secret})
        await connection_service._sync_legacy_account(
            db,
            connection,
            integration,
            {"secret": secret},
        )

        endpoint = WebhookEndpoint(
            user_id=user_id,
            connection_id=connection.id,
            name=name,
            direction=WebhookDirection.INCOMING,
            url_token=url_token,
            secret_hash=secret_hash,
            workflow_id=workflow_id,
        )
        db.add(endpoint)
        await db.flush()
        return endpoint, secret

    async def create_outgoing(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        name: str,
        target_url: str,
    ) -> WebhookEndpoint:
        url_token = secrets.token_urlsafe(24)
        secret = connection_service.generate_secret()
        endpoint = WebhookEndpoint(
            user_id=user_id,
            name=name,
            direction=WebhookDirection.OUTGOING,
            url_token=url_token,
            secret_hash=connection_service.hash_secret(secret),
            target_url=target_url,
        )
        db.add(endpoint)
        await db.flush()
        return endpoint

    async def delete_endpoint(
        self, db: AsyncSession, endpoint: WebhookEndpoint
    ) -> None:
        endpoint.is_active = False
        if endpoint.connection_id:
            result = await db.execute(
                select(IntegrationConnection).where(
                    IntegrationConnection.id == endpoint.connection_id
                )
            )
            conn = result.scalar_one_or_none()
            if conn:
                await connection_service.disconnect(db, conn)
        await db.flush()

    async def rotate_secret(
        self, db: AsyncSession, endpoint: WebhookEndpoint
    ) -> str:
        secret = connection_service.generate_secret()
        endpoint.secret_hash = connection_service.hash_secret(secret)
        if endpoint.connection_id:
            await connection_service.store_credentials(
                db, endpoint.connection_id, {"secret": secret}
            )
            row = await connection_service.get_connection(
                db, endpoint.connection_id, endpoint.user_id
            )
            if row:
                conn, integration = row
                await connection_service._sync_legacy_account(
                    db, conn, integration, {"secret": secret}
                )
        await db.flush()
        return secret

    def build_inbound_url(self, url_token: str) -> str:
        settings = get_settings()
        return f"{settings.api_public_url}/api/v1/webhooks/inbound/{url_token}"

    def verify_inbound_secret(self, provided: str, endpoint: WebhookEndpoint, stored_secret: str) -> bool:
        if connection_service.hash_secret(provided) == endpoint.secret_hash:
            return True
        return verify_webhook_secret(provided, stored_secret)

    async def log_delivery(
        self,
        db: AsyncSession,
        *,
        endpoint: WebhookEndpoint,
        direction: WebhookDirection,
        status: WebhookLogStatus,
        request_payload: dict[str, Any],
        response_payload: dict[str, Any] | None = None,
        status_code: int | None = None,
        error_message: str | None = None,
    ) -> WebhookLog:
        log = WebhookLog(
            endpoint_id=endpoint.id,
            user_id=endpoint.user_id,
            direction=direction,
            status=status,
            request_payload=request_payload,
            response_payload=response_payload,
            status_code=status_code,
            error_message=error_message,
            completed_at=datetime.now(UTC),
        )
        db.add(log)
        await db.flush()
        return log

    async def list_logs(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        endpoint_id: uuid.UUID | None = None,
        status: WebhookLogStatus | None = None,
        limit: int = 50,
    ) -> list[WebhookLog]:
        query = select(WebhookLog).where(WebhookLog.user_id == user_id)
        if endpoint_id:
            query = query.where(WebhookLog.endpoint_id == endpoint_id)
        if status:
            query = query.where(WebhookLog.status == status)
        query = query.order_by(WebhookLog.created_at.desc()).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def retry_log(
        self, db: AsyncSession, log: WebhookLog, user_id: uuid.UUID
    ) -> WebhookLog:
        endpoint = await self.get_endpoint(db, log.endpoint_id, user_id)
        if endpoint is None:
            raise ValueError("Endpoint not found")
        log.retry_count += 1
        log.status = WebhookLogStatus.PENDING
        log.error_message = None
        await db.flush()
        return log


webhook_service = WebhookService()
