"""Outgoing webhook delivery with logging, retries, and backoff."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration_platform import (
    WebhookDirection,
    WebhookEndpoint,
    WebhookLog,
    WebhookLogStatus,
)
from app.services.integrations.webhook_service import webhook_service

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 4
ATTEMPT_DELAYS = (0, 2, 8, 30)  # seconds between attempts
HTTP_TIMEOUT = 20.0


def _sign_payload(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def _deliver_once(
    endpoint: WebhookEndpoint,
    secret: str,
    payload: dict[str, Any],
    attempt: int,
) -> tuple[int | None, dict[str, Any] | None, str | None]:
    body = json.dumps(payload, default=str).encode()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "AgentFlow-Webhook/1.0",
        "X-AgentFlow-Event": "outgoing",
        "X-AgentFlow-Delivery": str(attempt),
    }
    if secret:
        headers["X-AgentFlow-Signature"] = f"sha256={_sign_payload(body, secret)}"

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(endpoint.target_url or "", content=body, headers=headers)
    except httpx.HTTPError as exc:
        return None, None, str(exc)

    status_code = resp.status_code
    try:
        response_payload = resp.json()
    except Exception:
        response_payload = {"text": resp.text[:2000]} if resp.text else None

    error = None if 200 <= status_code < 300 else f"HTTP {status_code}"
    return status_code, response_payload, error


async def deliver_outgoing(
    db: AsyncSession,
    endpoint: WebhookEndpoint,
    payload: dict[str, Any],
    *,
    secret: str = "",
) -> WebhookLog:
    """Deliver an outgoing webhook with up to MAX_ATTEMPTS retries. Logs every attempt."""
    if endpoint.direction != WebhookDirection.OUTGOING:
        raise ValueError("Endpoint is not outgoing")
    if not endpoint.target_url:
        raise ValueError("Outgoing endpoint has no target_url")

    log = await webhook_service.log_delivery(
        db,
        endpoint=endpoint,
        direction=WebhookDirection.OUTGOING,
        status=WebhookLogStatus.PENDING,
        request_payload=payload,
    )

    last_status_code: int | None = None
    last_response: dict[str, Any] | None = None
    last_error: str | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        if attempt > 1:
            delay = ATTEMPT_DELAYS[min(attempt - 1, len(ATTEMPT_DELAYS) - 1)]
            await asyncio.sleep(delay)

        status_code, response_payload, error = await _deliver_once(
            endpoint, secret, payload, attempt
        )
        last_status_code = status_code
        last_response = response_payload
        last_error = error

        if error is None:
            log.status = WebhookLogStatus.SUCCESS
            log.status_code = status_code
            log.response_payload = response_payload
            log.error_message = None
            log.retry_count = attempt - 1
            log.completed_at = datetime.now(UTC)
            await db.flush()
            return log

        log.retry_count = attempt - 1
        log.status_code = status_code
        log.response_payload = response_payload
        log.error_message = error
        await db.flush()

    log.status = WebhookLogStatus.FAILED
    log.status_code = last_status_code
    log.response_payload = last_response
    log.error_message = last_error or "Delivery failed"
    log.completed_at = datetime.now(UTC)
    await db.flush()
    return log


async def retry_log_delivery(
    db: AsyncSession,
    log: WebhookLog,
    user_id: uuid.UUID,
) -> WebhookLog:
    """Re-deliver a previously failed outgoing webhook log."""
    endpoint = await webhook_service.get_endpoint(db, log.endpoint_id, user_id)
    if endpoint is None:
        raise ValueError("Endpoint not found")
    if endpoint.direction != WebhookDirection.OUTGOING:
        # Incoming logs just reset to pending for record-keeping.
        log.retry_count += 1
        log.status = WebhookLogStatus.PENDING
        log.error_message = None
        await db.flush()
        return log

    secret = ""
    if endpoint.connection_id:
        from app.services.integrations.connection_service import connection_service

        creds = await connection_service.get_credentials(db, endpoint.connection_id)
        secret = creds.get("secret", "")

    log.retry_count += 1
    await db.flush()

    status_code, response_payload, error = await _deliver_once(
        endpoint, secret, log.request_payload or {}, log.retry_count + 1
    )
    if error is None:
        log.status = WebhookLogStatus.SUCCESS
        log.status_code = status_code
        log.response_payload = response_payload
        log.error_message = None
    else:
        log.status = WebhookLogStatus.FAILED
        log.status_code = status_code
        log.response_payload = response_payload
        log.error_message = error
    log.completed_at = datetime.now(UTC)
    await db.flush()
    return log


async def list_outgoing_endpoints(
    db: AsyncSession, user_id: uuid.UUID
) -> list[WebhookEndpoint]:
    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.user_id == user_id,
            WebhookEndpoint.direction == WebhookDirection.OUTGOING,
            WebhookEndpoint.is_active.is_(True),
        ).order_by(WebhookEndpoint.created_at.desc())
    )
    return list(result.scalars().all())
