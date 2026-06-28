"""OAuth state and token management."""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.integration_platform import IntegrationConnection, OAuthToken
from app.services.integrations.credential_encryption import get_encryption_service

_oauth_states: dict[str, dict[str, Any]] = {}


class OAuthService:
    def generate_state(self, user_id: uuid.UUID, provider: str, target_provider: str) -> str:
        state = secrets.token_urlsafe(32)
        _oauth_states[state] = {
            "user_id": str(user_id),
            "provider": provider,
            "target_provider": target_provider,
        }
        return state

    def pop_state(self, state: str) -> dict[str, Any] | None:
        return _oauth_states.pop(state, None)

    async def save_tokens(
        self,
        db: AsyncSession,
        connection: IntegrationConnection,
        *,
        access_token: str,
        refresh_token: str | None = None,
        expires_in: int | None = None,
        scopes: list[str] | None = None,
    ) -> OAuthToken:
        enc = get_encryption_service()
        expires_at = None
        if expires_in:
            expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)

        result = await db.execute(
            select(OAuthToken).where(OAuthToken.connection_id == connection.id)
        )
        token_row = result.scalar_one_or_none()
        if token_row is None:
            token_row = OAuthToken(connection_id=connection.id)
            db.add(token_row)

        token_row.access_token_encrypted = enc.encrypt_value(access_token)
        token_row.refresh_token_encrypted = (
            enc.encrypt_value(refresh_token) if refresh_token else None
        )
        token_row.expires_at = expires_at
        token_row.scopes = scopes or []
        await db.flush()
        return token_row

    async def get_access_token(
        self, db: AsyncSession, connection_id: uuid.UUID
    ) -> str | None:
        result = await db.execute(
            select(OAuthToken).where(OAuthToken.connection_id == connection_id)
        )
        token_row = result.scalar_one_or_none()
        if token_row is None:
            return None
        enc = get_encryption_service()
        return enc.decrypt_value(token_row.access_token_encrypted)

    async def exchange_google_code(self, code: str) -> dict[str, Any]:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def fetch_google_userinfo(self, access_token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()


oauth_service = OAuthService()
