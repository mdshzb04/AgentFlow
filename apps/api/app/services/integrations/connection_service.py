"""Integration connection CRUD with encrypted credentials and legacy sync."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import (
    AccountStatus,
    IntegrationAccount,
    IntegrationProvider,
)
from app.models.integration_platform import (
    ConnectionStatus,
    EncryptedCredential,
    Integration,
    IntegrationAuditLog,
    IntegrationConnection,
    WorkflowImport,
)
from app.services.integrations.credential_encryption import get_encryption_service


class ConnectionService:
    async def ensure_integration_catalog(self, db: AsyncSession) -> None:
        """Insert missing catalog rows (dev create_all skips Alembic seeds)."""
        from app.services.integrations.integration_service import PROVIDER_CARDS

        for meta in PROVIDER_CARDS:
            slug = meta["slug"]
            existing = await self.get_integration_by_slug(db, slug)
            if existing is None:
                db.add(
                    Integration(
                        slug=slug,
                        name=meta["name"],
                        auth_type=meta["auth_type"],
                    )
                )
        await db.flush()

    async def get_integration_by_slug(self, db: AsyncSession, slug: str) -> Integration | None:
        result = await db.execute(select(Integration).where(Integration.slug == slug))
        return result.scalar_one_or_none()

    async def list_connections(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        slug: str | None = None,
    ) -> list[tuple[IntegrationConnection, Integration]]:
        query = (
            select(IntegrationConnection, Integration)
            .join(Integration, IntegrationConnection.integration_id == Integration.id)
            .where(IntegrationConnection.user_id == user_id)
            .order_by(IntegrationConnection.updated_at.desc())
        )
        if slug:
            query = query.where(Integration.slug == slug)
        result = await db.execute(query)
        return list(result.all())

    async def get_connection(
        self, db: AsyncSession, connection_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[IntegrationConnection, Integration] | None:
        result = await db.execute(
            select(IntegrationConnection, Integration)
            .join(Integration, IntegrationConnection.integration_id == Integration.id)
            .where(
                IntegrationConnection.id == connection_id,
                IntegrationConnection.user_id == user_id,
            )
        )
        row = result.first()
        return row if row else None

    async def get_connection_by_legacy_account(
        self, db: AsyncSession, legacy_account_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[IntegrationConnection, Integration] | None:
        result = await db.execute(
            select(IntegrationConnection, Integration)
            .join(Integration, IntegrationConnection.integration_id == Integration.id)
            .where(
                IntegrationConnection.legacy_account_id == legacy_account_id,
                IntegrationConnection.user_id == user_id,
            )
        )
        row = result.first()
        return row if row else None

    @staticmethod
    async def _preflight_n8n(base_url: str, api_key: str) -> None:
        """Validate n8n credentials before persisting a connection."""
        import httpx

        from app.services.integrations.n8n_url import format_n8n_connection_error, resolve_n8n_base_url

        base_url = base_url.rstrip("/")
        if not base_url:
            raise ValueError("base_url is required")
        if not api_key:
            raise ValueError("api_key is required")

        request_url = resolve_n8n_base_url(base_url)
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(
                    f"{request_url}/api/v1/workflows",
                    headers={"X-N8N-API-KEY": api_key},
                    params={"limit": 1},
                )
            except httpx.HTTPError as exc:
                raise ValueError(format_n8n_connection_error(exc, base_url)) from exc
            if resp.status_code == 401:
                raise ValueError("Invalid n8n API key")
            if resp.status_code == 404:
                raise ValueError("n8n API not found at that base URL")
            if resp.status_code >= 400:
                raise ValueError(f"n8n returned {resp.status_code}")

    async def get_credentials(
        self, db: AsyncSession, connection_id: uuid.UUID
    ) -> dict[str, Any]:
        result = await db.execute(
            select(EncryptedCredential).where(EncryptedCredential.connection_id == connection_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return {}
        enc = get_encryption_service()
        if row.key_version == 0:
            return enc.decrypt(row.ciphertext)
        return enc.decrypt(row.ciphertext)

    async def store_credentials(
        self, db: AsyncSession, connection_id: uuid.UUID, data: dict[str, Any]
    ) -> None:
        enc = get_encryption_service()
        ciphertext = enc.encrypt(data)
        result = await db.execute(
            select(EncryptedCredential).where(EncryptedCredential.connection_id == connection_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = EncryptedCredential(connection_id=connection_id, ciphertext=ciphertext, key_version=1)
            db.add(row)
        else:
            row.ciphertext = ciphertext
            row.key_version = 1
        await db.flush()

    async def _sync_legacy_account(
        self,
        db: AsyncSession,
        connection: IntegrationConnection,
        integration: Integration,
        credentials: dict[str, Any],
    ) -> IntegrationAccount:
        provider_map = {
            "gmail": IntegrationProvider.GMAIL,
            "slack": IntegrationProvider.SLACK,
            "google_sheets": IntegrationProvider.GOOGLE_SHEETS,
            "n8n": IntegrationProvider.N8N,
            "webhooks": IntegrationProvider.WEBHOOK,
        }
        provider = provider_map.get(integration.slug)
        if provider is None:
            raise ValueError(f"Unknown provider slug: {integration.slug}")

        account: IntegrationAccount | None = None
        if connection.legacy_account_id:
            result = await db.execute(
                select(IntegrationAccount).where(IntegrationAccount.id == connection.legacy_account_id)
            )
            account = result.scalar_one_or_none()

        if account is None:
            account = IntegrationAccount(
                id=connection.id,
                user_id=connection.user_id,
                provider=provider,
                name=connection.display_name,
                external_account_id=connection.external_id,
                account_email=connection.account_email,
                credentials=credentials,
                account_metadata=connection.connection_metadata,
                status=AccountStatus.ACTIVE,
            )
            db.add(account)
            connection.legacy_account_id = account.id
        else:
            account.name = connection.display_name
            account.external_account_id = connection.external_id
            account.account_email = connection.account_email
            account.credentials = credentials
            account.account_metadata = connection.connection_metadata
            account.status = AccountStatus.ACTIVE
            account.updated_at = datetime.now(UTC)

        await db.flush()
        return account

    async def create_n8n_connection(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        base_url: str,
        api_key: str,
        ip_address: str | None = None,
    ) -> IntegrationConnection:
        integration = await self.get_integration_by_slug(db, "n8n")
        if integration is None:
            raise ValueError("n8n integration not configured")

        base_url = base_url.rstrip("/")
        await self._preflight_n8n(base_url, api_key)

        hostname = urlparse(base_url).hostname or "n8n"
        display_name = f"n8n ({hostname})"

        # Reuse an existing connection to the same instance instead of duplicating.
        existing = await db.execute(
            select(IntegrationConnection)
            .join(Integration)
            .where(
                IntegrationConnection.user_id == user_id,
                Integration.slug == "n8n",
                IntegrationConnection.external_id == base_url,
            )
        )
        connection = existing.scalars().first()
        if connection is not None:
            connection.display_name = display_name
            connection.connection_metadata = {**connection.connection_metadata, "base_url": base_url}
            connection.external_id = base_url
            connection.status = ConnectionStatus.CONNECTED
            connection.health_status = "healthy"
            connection.last_error = None
            connection.last_sync_at = datetime.now(UTC)
            await self.store_credentials(db, connection.id, {"api_key": api_key, "base_url": base_url})
            await self._sync_legacy_account(
                db, connection, integration, {"api_key": api_key, "base_url": base_url}
            )
            await self._audit(db, user_id, connection.id, "reconnect", {"provider": "n8n"}, ip_address)
            return connection

        connection = IntegrationConnection(
            user_id=user_id,
            integration_id=integration.id,
            display_name=display_name,
            external_id=base_url,
            status=ConnectionStatus.CONNECTED,
            health_status="healthy",
            connection_metadata={"base_url": base_url},
            last_sync_at=datetime.now(UTC),
        )
        db.add(connection)
        await db.flush()

        await self.store_credentials(db, connection.id, {"api_key": api_key, "base_url": base_url})
        await self._sync_legacy_account(
            db, connection, integration, {"api_key": api_key, "base_url": base_url}
        )
        await self._audit(db, user_id, connection.id, "connect", {"provider": "n8n"}, ip_address)
        return connection

    async def create_notion_connection(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        api_key: str,
        ip_address: str | None = None,
    ) -> IntegrationConnection:
        from app.services.integrations.notion_service import get_notion_service

        integration = await self.get_integration_by_slug(db, "notion")
        if integration is None:
            raise ValueError("Notion integration not configured")

        existing = await db.execute(
            select(IntegrationConnection)
            .join(Integration)
            .where(
                IntegrationConnection.user_id == user_id,
                Integration.slug == "notion",
                IntegrationConnection.status == ConnectionStatus.CONNECTED,
            )
        )
        for old_conn, _ in existing.all():
            old_conn.status = ConnectionStatus.DISCONNECTED

        notion = get_notion_service(api_key)
        health = await notion.test_connection()
        if not health.get("healthy"):
            raise ValueError(health.get("message", "Invalid Notion API key"))

        workspace = health.get("workspace_name") or "Notion Workspace"
        connection = IntegrationConnection(
            user_id=user_id,
            integration_id=integration.id,
            display_name=f"Notion ({workspace})",
            account_email=None,
            external_id=health.get("user_id"),
            status=ConnectionStatus.CONNECTED,
            health_status="healthy",
            connection_metadata={
                "workspace_name": workspace,
                "notion_user_id": health.get("user_id"),
            },
            last_sync_at=datetime.now(UTC),
        )
        db.add(connection)
        await db.flush()

        await self.store_credentials(db, connection.id, {"api_key": api_key})
        await self._audit(db, user_id, connection.id, "connect", {"provider": "notion"}, ip_address)
        return connection

    async def update_n8n_connection(
        self,
        db: AsyncSession,
        connection: IntegrationConnection,
        integration: Integration,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        ip_address: str | None = None,
    ) -> IntegrationConnection:
        creds = await self.get_credentials(db, connection.id)
        effective_base_url = (base_url or creds.get("base_url") or connection.external_id or "").rstrip("/")
        effective_api_key = api_key or creds.get("api_key", "")
        if base_url or api_key:
            await self._preflight_n8n(effective_base_url, effective_api_key)

        if base_url:
            base_url = base_url.rstrip("/")
            connection.external_id = base_url
            connection.connection_metadata = {
                **connection.connection_metadata,
                "base_url": base_url,
            }
            creds["base_url"] = base_url
            hostname = urlparse(base_url).hostname or "n8n"
            connection.display_name = f"n8n ({hostname})"
        if api_key:
            creds["api_key"] = api_key

        await self.store_credentials(db, connection.id, creds)
        await self._sync_legacy_account(db, connection, integration, creds)
        connection.status = ConnectionStatus.CONNECTED
        connection.health_status = "healthy"
        connection.last_sync_at = datetime.now(UTC)
        connection.last_error = None
        await db.flush()
        await self._audit(db, connection.user_id, connection.id, "update", {"provider": "n8n"}, ip_address)
        return connection

    async def create_oauth_connection(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        slug: str,
        *,
        display_name: str,
        account_email: str | None,
        external_id: str | None,
        credentials: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> IntegrationConnection:
        integration = await self.get_integration_by_slug(db, slug)
        if integration is None:
            raise ValueError(f"Integration {slug} not found")

        existing = await db.execute(
            select(IntegrationConnection)
            .join(Integration)
            .where(
                IntegrationConnection.user_id == user_id,
                Integration.slug == slug,
                IntegrationConnection.status == ConnectionStatus.CONNECTED,
            )
        )
        for old_conn, _ in existing.all():
            old_conn.status = ConnectionStatus.DISCONNECTED

        connection = IntegrationConnection(
            user_id=user_id,
            integration_id=integration.id,
            display_name=display_name,
            account_email=account_email,
            external_id=external_id,
            status=ConnectionStatus.CONNECTED,
            health_status="healthy",
            connection_metadata=metadata or {},
            last_sync_at=datetime.now(UTC),
        )
        db.add(connection)
        await db.flush()

        await self.store_credentials(db, connection.id, credentials)
        legacy = await self._sync_legacy_account(db, connection, integration, credentials)
        connection.legacy_account_id = legacy.id
        await db.flush()
        return connection

    async def disconnect(
        self,
        db: AsyncSession,
        connection: IntegrationConnection,
        ip_address: str | None = None,
    ) -> None:
        connection.status = ConnectionStatus.DISCONNECTED
        connection.health_status = "disconnected"
        if connection.legacy_account_id:
            result = await db.execute(
                select(IntegrationAccount).where(IntegrationAccount.id == connection.legacy_account_id)
            )
            account = result.scalar_one_or_none()
            if account:
                account.status = AccountStatus.REVOKED
        await db.flush()
        await self._audit(
            db, connection.user_id, connection.id, "disconnect", {}, ip_address
        )

    async def sync_from_legacy_account(
        self,
        db: AsyncSession,
        account: IntegrationAccount,
        slug: str,
    ) -> IntegrationConnection:
        await self.ensure_integration_catalog(db)
        integration = await self.get_integration_by_slug(db, slug)
        if integration is None:
            raise ValueError(f"Unknown integration slug: {slug}")

        result = await db.execute(
            select(IntegrationConnection).where(IntegrationConnection.id == account.id)
        )
        connection = result.scalar_one_or_none()
        status_map = {
            AccountStatus.ACTIVE: ConnectionStatus.CONNECTED,
            AccountStatus.EXPIRED: ConnectionStatus.EXPIRED,
            AccountStatus.REVOKED: ConnectionStatus.DISCONNECTED,
        }
        if connection is None:
            connection = IntegrationConnection(
                id=account.id,
                user_id=account.user_id,
                integration_id=integration.id,
                legacy_account_id=account.id,
                display_name=account.name,
                account_email=account.account_email,
                external_id=account.external_account_id,
                status=status_map.get(account.status, ConnectionStatus.CONNECTED),
                health_status="healthy",
                connection_metadata=account.account_metadata,
                last_sync_at=datetime.now(UTC),
            )
            db.add(connection)
        else:
            connection.display_name = account.name
            connection.account_email = account.account_email
            connection.external_id = account.external_account_id
            connection.status = status_map.get(account.status, ConnectionStatus.CONNECTED)
            connection.connection_metadata = account.account_metadata
            connection.last_sync_at = datetime.now(UTC)

        await db.flush()
        await self.store_credentials(db, connection.id, account.credentials)
        return connection

    async def count_workflow_imports(self, db: AsyncSession, connection_id: uuid.UUID) -> int:
        result = await db.execute(
            select(func.count()).select_from(WorkflowImport).where(
                WorkflowImport.connection_id == connection_id
            )
        )
        return int(result.scalar_one())

    async def record_health(
        self,
        db: AsyncSession,
        connection: IntegrationConnection,
        *,
        healthy: bool,
        message: str | None = None,
        version: str | None = None,
    ) -> None:
        connection.health_status = "healthy" if healthy else "error"
        connection.last_error = None if healthy else message
        if healthy:
            connection.last_sync_at = datetime.now(UTC)
        if version:
            connection.connection_metadata = {
                **connection.connection_metadata,
                "version": version,
            }
        await db.flush()

    async def _audit(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        connection_id: uuid.UUID | None,
        action: str,
        details: dict[str, Any],
        ip_address: str | None,
    ) -> None:
        db.add(
            IntegrationAuditLog(
                user_id=user_id,
                connection_id=connection_id,
                action=action,
                details=details,
                ip_address=ip_address,
            )
        )
        await db.flush()

    @staticmethod
    def hash_secret(secret: str) -> str:
        return hashlib.sha256(secret.encode()).hexdigest()

    @staticmethod
    def generate_secret() -> str:
        return secrets.token_urlsafe(32)


connection_service = ConnectionService()
