import base64
import re
from email.mime.text import MIMEText
from typing import Any

import httpx

from app.models.integration import IntegrationAccount
from app.services.integrations.accounts import refresh_google_token
from app.services.prompt_templates import render_prompt


def _render(value: str, context: dict[str, Any]) -> str:
    flat = {k: str(v) for k, v in context.items()}
    return render_prompt(value, flat)


async def send_gmail(
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
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

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": raw},
        )
        if response.status_code == 401:
            raise ValueError("Gmail token expired — reconnect your account")
        response.raise_for_status()
        return response.json()


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
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    action = config.get("action", "send")
    if action == "read":
        return await read_gmail(account, config, context)
    return await send_gmail(account, config, context)
