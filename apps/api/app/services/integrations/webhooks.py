import json
import hashlib
import hmac
from typing import Any

import httpx

from app.services.prompt_templates import render_prompt


def _render(value: str, context: dict[str, Any]) -> str:
    flat = {k: str(v) for k, v in context.items()}
    return render_prompt(value, flat)


async def outbound_webhook(
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    url = config.get("url", "")
    method = config.get("method", "POST").upper()
    headers = dict(config.get("headers", {}))
    body_template = config.get("bodyTemplate")
    secret = config.get("secret")

    if not url:
        raise ValueError("Webhook node requires a URL")

    payload: dict[str, Any] = {"event": "workflow_step", "data": context}
    if body_template:
        if isinstance(body_template, str):
            payload = {"raw": _render(body_template, context)}
        else:
            payload = body_template

    body_bytes = json.dumps(payload).encode()
    if secret:
        signature = hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
        headers["X-AgentFlow-Signature"] = signature

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(method, url, headers=headers, json=payload)
        return {
            "status_code": response.status_code,
            "body": response.text[:2000],
            "url": url,
        }


def verify_webhook_secret(provided: str, expected: str) -> bool:
    return hmac.compare_digest(provided, expected)
