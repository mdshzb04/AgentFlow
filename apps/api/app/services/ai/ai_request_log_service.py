"""Persist live LLM API call metrics (tokens, latency, model, cost, request history)."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_request_log import AiRequestLog, AiRequestStatus

logger = logging.getLogger(__name__)

# USD per 1M tokens, keyed by model prefix. Falls back to provider default.
MODEL_PRICING_PER_1M: dict[str, tuple[float, float]] = {
    # OpenAI
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4-turbo": (10.00, 30.00),
    "gpt-4": (30.00, 60.00),
    "gpt-3.5": (0.50, 1.50),
    "o1": (15.00, 60.00),
    "o3": (10.00, 40.00),
    # Anthropic
    "claude-3-5-sonnet": (3.00, 15.00),
    "claude-3-5-haiku": (0.80, 4.00),
    "claude-3-opus": (15.00, 75.00),
    "claude-3-sonnet": (3.00, 15.00),
    "claude-3-haiku": (0.25, 1.25),
}

PROVIDER_DEFAULT_PER_1M: dict[str, tuple[float, float]] = {
    "openai": (2.50, 10.00),
    "anthropic": (3.00, 15.00),
}


def estimate_cost(provider: str, model: str, prompt_tokens: int, completion_tokens: int) -> float:
    model_lower = (model or "").lower()
    rates = None
    for prefix, r in MODEL_PRICING_PER_1M.items():
        if model_lower.startswith(prefix):
            rates = r
            break
    if rates is None:
        rates = PROVIDER_DEFAULT_PER_1M.get(provider, PROVIDER_DEFAULT_PER_1M["openai"])
    input_rate, output_rate = rates
    return (prompt_tokens * input_rate + completion_tokens * output_rate) / 1_000_000


def _extract_tokens(usage: dict[str, Any] | None) -> tuple[int, int, int]:
    if not usage:
        return 0, 0, 0
    prompt = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
    completion = int(usage.get("completion_tokens") or usage.get("output_tokens") or 0)
    total = int(usage.get("total_tokens") or (prompt + completion))
    return prompt, completion, total


async def log_ai_request(
    db: AsyncSession | None,
    *,
    user_id: uuid.UUID | None,
    provider: str,
    model: str,
    usage: dict[str, Any] | None,
    latency_ms: int,
    status: AiRequestStatus = AiRequestStatus.SUCCESS,
    request_preview: str | None = None,
    response_preview: str | None = None,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AiRequestLog | None:
    if db is None or user_id is None:
        return None
    prompt, completion, total = _extract_tokens(usage)
    cost = estimate_cost(provider, model, prompt, completion)
    log = AiRequestLog(
        user_id=user_id,
        provider=provider,
        model=model,
        status=status,
        prompt_tokens=prompt,
        completion_tokens=completion,
        total_tokens=total,
        latency_ms=latency_ms,
        cost_usd=cost,
        request_preview=(request_preview or "")[:4000] or None,
        response_preview=(response_preview or "")[:4000] or None,
        error_message=error_message,
        extra=metadata or {},
    )
    db.add(log)
    try:
        await db.flush()
    except Exception as exc:  # never let logging break an LLM call
        logger.warning("Failed to persist AiRequestLog: %s", exc)
        return None
    return log


async def list_ai_request_logs(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    limit: int = 50,
) -> list[AiRequestLog]:
    result = await db.execute(
        select(AiRequestLog)
        .where(AiRequestLog.user_id == user_id)
        .order_by(AiRequestLog.created_at.desc())
        .limit(min(limit, 200))
    )
    return list(result.scalars().all())


class _RequestTimer:
    def __init__(self) -> None:
        self._start = time.monotonic()

    def elapsed_ms(self) -> int:
        return int((time.monotonic() - self._start) * 1000)


def start_timer() -> _RequestTimer:
    return _RequestTimer()
