import base64
import re
import uuid
from email.mime.text import MIMEText
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import IntegrationAccount
from app.models.integration_platform import EmailLog
from app.services.integrations.accounts import refresh_google_token
from app.services.prompt_templates import render_prompt


def _render(value: str, context: dict[str, Any]) -> str:
    flat = {k: str(v) for k, v in context.items()}
    return render_prompt(value, flat)


async def send_gmail(
    db: AsyncSession,
    user_id: uuid.UUID,
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
    *,
    related_entity: str | None = None,
    related_id: str | None = None,
) -> dict[str, Any]:
    access_token = await refresh_google_token(account)
    to = _render(config.get("to", ""), context)
    subject = _render(config.get("subject", "AgentFlow Notification"), context)
    body = _render(config.get("body", ""), context)

    if not to:
        raise ValueError("Gmail node requires a 'to' address")
    if not body and context.get("last_ai_output"):
        body = str(context["last_ai_output"])
    if not body:
        body = "Message from AgentFlow CRM workflow."

    message = MIMEText(body)
    message["to"] = to
    message["from"] = account.account_email or "me"
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    provider_message_id: str | None = None
    thread_id: str | None = None
    error_message: str | None = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"raw": raw},
            )
            if response.status_code == 401:
                raise ValueError("Gmail token expired — reconnect your account")
            response.raise_for_status()
            data = response.json()
            provider_message_id = data.get("id")
            thread_id = data.get("threadId")
            return data
    except Exception as exc:
        error_message = str(exc)
        raise
    finally:
        try:
            db.add(
                EmailLog(
                    user_id=user_id,
                    connection_id=account.id if isinstance(account.id, uuid.UUID) else None,
                    to_address=to,
                    from_address=account.account_email,
                    subject=subject,
                    body=body,
                    provider_message_id=provider_message_id,
                    thread_id=thread_id,
                    status="sent" if error_message is None else "failed",
                    error_message=error_message,
                    related_entity=related_entity,
                    related_id=str(related_id) if related_id else None,
                )
            )
            await db.flush()
        except Exception:
            pass


async def read_gmail(
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    access_token = await refresh_google_token(account)
    query = _render(config.get("query", "is:unread"), context)
    max_results = int(config.get("maxResults", 5))

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"q": query, "maxResults": max_results},
        )
        response.raise_for_status()
        data = response.json()
        return {"messages": data.get("messages", []), "resultSizeEstimate": data.get("resultSizeEstimate", 0)}


async def execute_gmail(
    db: AsyncSession,
    user_id: uuid.UUID,
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
    *,
    related_entity: str | None = None,
    related_id: str | None = None,
) -> dict[str, Any]:
    action = config.get("action", "send")
    if action == "read":
        return await read_gmail(account, config, context)
    return await send_gmail(
        db,
        user_id,
        account,
        config,
        context,
        related_entity=related_entity,
        related_id=related_id,
    )
