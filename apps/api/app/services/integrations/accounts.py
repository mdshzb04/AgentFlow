import secrets
import uuid
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.integration import (
    AccountStatus,
    IntegrationAccount,
    IntegrationProvider,
)

_oauth_states: dict[str, dict[str, Any]] = {}


def generate_oauth_state(user_id: uuid.UUID, provider: str, target_provider: str) -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "user_id": str(user_id),
        "provider": provider,
        "target_provider": target_provider,
    }
    return state


def pop_oauth_state(state: str) -> dict[str, Any] | None:
    return _oauth_states.pop(state, None)


async def list_accounts(
    db: AsyncSession,
    user_id: uuid.UUID,
    provider: IntegrationProvider | None = None,
) -> list[IntegrationAccount]:
    query = select(IntegrationAccount).where(IntegrationAccount.user_id == user_id)
    if provider:
        query = query.where(IntegrationAccount.provider == provider)
    query = query.order_by(IntegrationAccount.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_account(
    db: AsyncSession,
    account_id: uuid.UUID,
    user_id: uuid.UUID,
) -> IntegrationAccount | None:
    result = await db.execute(
        select(IntegrationAccount).where(
            IntegrationAccount.id == account_id,
            IntegrationAccount.user_id == user_id,
            IntegrationAccount.status == AccountStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none()


async def delete_account(
    db: AsyncSession,
    account: IntegrationAccount,
) -> None:
    account.status = AccountStatus.REVOKED
    await db.flush()


async def create_webhook_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    workflow_id: uuid.UUID | None = None,
) -> IntegrationAccount:
    webhook_token = secrets.token_urlsafe(24)
    secret = secrets.token_urlsafe(32)
    account = IntegrationAccount(
        user_id=user_id,
        provider=IntegrationProvider.WEBHOOK,
        name=name,
        external_account_id=webhook_token,
        credentials={"secret": secret},
        account_metadata={
            "webhook_token": webhook_token,
            "workflow_id": str(workflow_id) if workflow_id else None,
        },
    )
    db.add(account)
    await db.flush()
    return account


def get_google_auth_url(state: str, scopes: list[str]) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
]

SHEETS_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
]


async def exchange_google_code(code: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def fetch_google_userinfo(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def save_google_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    token_data: dict[str, Any],
    provider: IntegrationProvider,
    userinfo: dict[str, Any],
) -> IntegrationAccount:
    email = userinfo.get("email", "Google Account")
    account = IntegrationAccount(
        user_id=user_id,
        provider=provider,
        name=f"{provider.value.replace('_', ' ').title()} — {email}",
        external_account_id=userinfo.get("id"),
        account_email=email,
        credentials={
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_at": (
                datetime.now(UTC).timestamp() + token_data.get("expires_in", 3600)
                if token_data.get("expires_in")
                else None
            ),
            "token_type": token_data.get("token_type", "Bearer"),
        },
        account_metadata={"scopes": token_data.get("scope", "")},
    )
    db.add(account)
    await db.flush()
    return account


async def refresh_google_token(account: IntegrationAccount) -> str:
    refresh_token = account.credentials.get("refresh_token")
    if not refresh_token:
        return account.credentials.get("access_token", "")

    expires_at = account.credentials.get("expires_at")
    if expires_at and datetime.now(UTC).timestamp() < expires_at - 60:
        return account.credentials["access_token"]

    settings = get_settings()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        token_data = response.json()

    account.credentials = {
        **account.credentials,
        "access_token": token_data["access_token"],
        "expires_at": datetime.now(UTC).timestamp() + token_data.get("expires_in", 3600),
    }
    return account.credentials["access_token"]
