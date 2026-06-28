import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentExecution, ExecutionStatus
from app.models.crm import Lead, LeadStatus
from app.models.integration import StepExecution, WorkflowExecution, WorkflowExecutionStatus
from app.schemas.analytics import (
    AiRequestPoint,
    AnalyticsOverview,
    AnalyticsSummary,
    FailedExecutionItem,
    LeadStatusCount,
    TimeSeriesPoint,
    TokenUsagePoint,
)

# Estimated USD per 1M tokens (input, output)
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "openai": (2.50, 10.00),
    "anthropic": (3.00, 15.00),
}


def _extract_tokens(usage: dict[str, Any] | None) -> tuple[int, int, int]:
    if not usage:
        return 0, 0, 0
    prompt = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
    completion = int(usage.get("completion_tokens") or usage.get("output_tokens") or 0)
    total = int(usage.get("total_tokens") or (prompt + completion))
    return prompt, completion, total


def _estimate_cost(provider: str, prompt: int, completion: int) -> float:
    input_rate, output_rate = MODEL_PRICING.get(provider, MODEL_PRICING["openai"])
    return (prompt * input_rate + completion * output_rate) / 1_000_000


def _day_key(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now(UTC).date().isoformat()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).date().isoformat()


def _fill_date_range(
    start: date,
    end: date,
    data: dict[str, dict[str, Any]],
    defaults: dict[str, Any],
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    current = start
    while current <= end:
        key = current.isoformat()
        row = {"date": key, **defaults, **data.get(key, {})}
        result.append(row)
        current += timedelta(days=1)
    return result


async def get_analytics_overview(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 30,
) -> AnalyticsOverview:
    days = max(1, min(days, 365))
    since = datetime.now(UTC) - timedelta(days=days)
    start_date = since.date()
    end_date = datetime.now(UTC).date()

    wf_result = await db.execute(
        select(WorkflowExecution).where(
            WorkflowExecution.user_id == user_id,
            WorkflowExecution.started_at >= since,
        )
    )
    workflow_execs = list(wf_result.scalars().all())

    ai_result = await db.execute(
        select(AgentExecution).where(
            AgentExecution.user_id == user_id,
            AgentExecution.created_at >= since,
        )
    )
    ai_execs = list(ai_result.scalars().all())

    step_result = await db.execute(
        select(StepExecution).where(
            StepExecution.user_id == user_id,
            StepExecution.created_at >= since,
        )
    )
    step_execs = list(step_result.scalars().all())

    lead_result = await db.execute(select(Lead).where(Lead.user_id == user_id))
    leads = list(lead_result.scalars().all())

    wf_completed = sum(1 for w in workflow_execs if w.status == WorkflowExecutionStatus.COMPLETED)
    wf_failed = sum(1 for w in workflow_execs if w.status == WorkflowExecutionStatus.FAILED)
    wf_total = len(workflow_execs)
    wf_success_rate = (wf_completed / wf_total * 100) if wf_total else 0.0

    ai_failed = sum(1 for a in ai_execs if a.status == ExecutionStatus.FAILED)
    step_failed = sum(1 for s in step_execs if s.status == "failed")
    failed_total = wf_failed + ai_failed + step_failed

    total_prompt = 0
    total_completion = 0
    total_tokens = 0
    total_cost = 0.0

    token_by_day: dict[str, dict[str, float]] = defaultdict(lambda: {"tokens": 0, "cost_usd": 0.0})
    ai_by_day: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "failed": 0})

    for ex in ai_execs:
        prompt, completion, tokens = _extract_tokens(ex.usage)
        total_prompt += prompt
        total_completion += completion
        total_tokens += tokens
        total_cost += _estimate_cost(ex.provider, prompt, completion)

        day = _day_key(ex.created_at)
        token_by_day[day]["tokens"] += tokens
        token_by_day[day]["cost_usd"] += _estimate_cost(ex.provider, prompt, completion)
        ai_by_day[day]["total"] += 1
        if ex.status == ExecutionStatus.FAILED:
            ai_by_day[day]["failed"] += 1

    wf_by_day: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "completed": 0, "failed": 0})
    for w in workflow_execs:
        day = _day_key(w.started_at)
        wf_by_day[day]["total"] += 1
        if w.status == WorkflowExecutionStatus.COMPLETED:
            wf_by_day[day]["completed"] += 1
        elif w.status == WorkflowExecutionStatus.FAILED:
            wf_by_day[day]["failed"] += 1

    total_leads = len(leads)
    converted = sum(1 for l in leads if l.status == LeadStatus.CONVERTED)
    conversion_rate = (converted / total_leads * 100) if total_leads else 0.0

    lead_counts: dict[str, int] = defaultdict(int)
    for lead in leads:
        status = lead.status.value if hasattr(lead.status, "value") else str(lead.status)
        lead_counts[status] += 1

    lead_funnel = [
        LeadStatusCount(status=s, count=c)
        for s, c in sorted(lead_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    recent_failures: list[FailedExecutionItem] = []
    for w in sorted(
        [x for x in workflow_execs if x.status == WorkflowExecutionStatus.FAILED],
        key=lambda x: x.started_at,
        reverse=True,
    )[:5]:
        recent_failures.append(
            FailedExecutionItem(
                type="workflow",
                id=str(w.id),
                message=w.error_message,
                occurred_at=w.started_at,
            )
        )
    for a in sorted(
        [x for x in ai_execs if x.status == ExecutionStatus.FAILED],
        key=lambda x: x.created_at,
        reverse=True,
    )[:5]:
        recent_failures.append(
            FailedExecutionItem(
                type="ai",
                id=str(a.id),
                message=a.error_message,
                occurred_at=a.created_at,
            )
        )
    recent_failures.sort(key=lambda x: x.occurred_at, reverse=True)
    recent_failures = recent_failures[:10]

    workflow_ts = [
        TimeSeriesPoint(**row)
        for row in _fill_date_range(
            start_date,
            end_date,
            {k: v for k, v in wf_by_day.items()},
            {"total": 0, "completed": 0, "failed": 0},
        )
    ]
    token_ts = [
        TokenUsagePoint(
            date=row["date"],
            tokens=int(row.get("tokens", 0)),
            cost_usd=round(float(row.get("cost_usd", 0)), 4),
        )
        for row in _fill_date_range(
            start_date,
            end_date,
            {k: v for k, v in token_by_day.items()},
            {"tokens": 0, "cost_usd": 0.0},
        )
    ]
    ai_ts = [
        AiRequestPoint(**row)
        for row in _fill_date_range(
            start_date,
            end_date,
            {k: v for k, v in ai_by_day.items()},
            {"total": 0, "failed": 0},
        )
    ]

    return AnalyticsOverview(
        period_days=days,
        summary=AnalyticsSummary(
            workflow_runs=wf_total,
            workflow_success_rate=round(wf_success_rate, 1),
            ai_requests=len(ai_execs),
            failed_executions=failed_total,
            total_tokens=total_tokens,
            prompt_tokens=total_prompt,
            completion_tokens=total_completion,
            estimated_cost_usd=round(total_cost, 4),
            total_leads=total_leads,
            converted_leads=converted,
            lead_conversion_rate=round(conversion_rate, 1),
        ),
        workflow_runs_timeseries=workflow_ts,
        token_usage_timeseries=token_ts,
        ai_requests_timeseries=ai_ts,
        lead_funnel=lead_funnel,
        recent_failures=recent_failures,
    )
