"""Live per-integration metrics aggregated from existing tables.

Every metric is read from a real table — no fabricated numbers. If no activity
exists, the corresponding field is 0/None and the frontend renders an empty
state such as "No meetings synced yet".
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_request_log import AiRequestLog, AiRequestStatus
from app.models.crm import Company, Contact, Deal, Lead, Note, Task
from app.models.integration import (
    IntegrationAccount,
    IntegrationProvider,
    StepExecution,
    WorkflowExecution,
    WorkflowExecutionStatus,
)
from app.models.integration_platform import (
    CrmSyncMapping,
    EmailLog,
    IntegrationConnection,
    WebhookEndpoint,
    WebhookLog,
    WebhookLogStatus,
)
from app.services.integrations.connection_service import connection_service


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


# ─── Google Sheets ───────────────────────────────────────────────────────────


async def google_sheets_metrics(
    db: AsyncSession, user_id: uuid.UUID, connection: IntegrationConnection | None
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "spreadsheet_name": None,
        "spreadsheet_url": None,
        "rows_synced": 0,
        "rows_by_entity": {},
        "last_synced_at": None,
        "last_error": None,
        "errors_total": 0,
    }
    if connection is None:
        return base
    spreadsheet_id = connection.connection_metadata.get("spreadsheet_id")
    spreadsheet_name = connection.connection_metadata.get("spreadsheet_name")
    if spreadsheet_name:
        base["spreadsheet_name"] = spreadsheet_name
    elif spreadsheet_id:
        base["spreadsheet_name"] = "AgentFlow CRM"
    if spreadsheet_id:
        base["spreadsheet_url"] = (
            f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"
        )

    rows_q = await db.execute(
        select(
            func.count(CrmSyncMapping.id),
            func.max(CrmSyncMapping.last_synced_at),
        ).where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "google_sheets",
        )
    )
    total, last_synced = rows_q.first() or (0, None)
    base["rows_synced"] = int(total or 0)
    base["last_synced_at"] = _iso(last_synced)

    by_entity_q = await db.execute(
        select(CrmSyncMapping.entity_type, func.count(CrmSyncMapping.id))
        .where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "google_sheets",
        )
        .group_by(CrmSyncMapping.entity_type)
    )
    base["rows_by_entity"] = {row[0]: int(row[1]) for row in by_entity_q.all()}

    errors_q = await db.execute(
        select(func.count(CrmSyncMapping.id)).where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "google_sheets",
            CrmSyncMapping.last_error.is_not(None),
        )
    )
    base["errors_total"] = int((errors_q.scalar() or 0))

    err_q = await db.execute(
        select(CrmSyncMapping.last_error, CrmSyncMapping.last_synced_at)
        .where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "google_sheets",
            CrmSyncMapping.last_error.is_not(None),
        )
        .order_by(CrmSyncMapping.updated_at.desc())
        .limit(1)
    )
    last_err = err_q.first()
    if last_err:
        base["last_error"] = {
            "message": last_err[0],
            "at": _iso(last_err[1]),
        }
    return base


# ─── Notion ──────────────────────────────────────────────────────────────────


async def notion_metrics(
    db: AsyncSession, user_id: uuid.UUID, connection: IntegrationConnection | None
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "workspace_name": connection.connection_metadata.get("workspace_name") if connection else None,
        "database_name": "AgentFlow CRM",
        "database_id": None,
        "pages_total": 0,
        "pages_by_type": {},
        "last_synced_at": None,
        "last_page_created_at": None,
        "last_error": None,
        "errors_total": 0,
    }
    if connection is None:
        return base
    base["database_id"] = connection.connection_metadata.get("crm_database_id")

    q = await db.execute(
        select(
            func.count(CrmSyncMapping.id),
            func.max(CrmSyncMapping.last_synced_at),
        ).where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "notion",
        )
    )
    total, last_synced = q.first() or (0, None)
    base["pages_total"] = int(total or 0)
    base["last_synced_at"] = _iso(last_synced)
    base["last_page_created_at"] = _iso(last_synced)

    by_type_q = await db.execute(
        select(CrmSyncMapping.entity_type, func.count(CrmSyncMapping.id))
        .where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "notion",
        )
        .group_by(CrmSyncMapping.entity_type)
    )
    base["pages_by_type"] = {row[0]: int(row[1]) for row in by_type_q.all()}

    errors_q = await db.execute(
        select(func.count(CrmSyncMapping.id)).where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "notion",
            CrmSyncMapping.last_error.is_not(None),
        )
    )
    base["errors_total"] = int(errors_q.scalar() or 0)

    last_err_q = await db.execute(
        select(CrmSyncMapping.last_error, CrmSyncMapping.last_synced_at)
        .where(
            CrmSyncMapping.user_id == user_id,
            CrmSyncMapping.connection_id == connection.id,
            CrmSyncMapping.provider == "notion",
            CrmSyncMapping.last_error.is_not(None),
        )
        .order_by(CrmSyncMapping.updated_at.desc())
        .limit(1)
    )
    last_err = last_err_q.first()
    if last_err:
        base["last_error"] = {"message": last_err[0], "at": _iso(last_err[1])}
    return base


# ─── Gmail ───────────────────────────────────────────────────────────────────


async def gmail_metrics(
    db: AsyncSession, user_id: uuid.UUID, connection: IntegrationConnection | None
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "emails_sent_today": 0,
        "emails_sent_total": 0,
        "emails_failed_today": 0,
        "emails_failed_total": 0,
        "last_sent_at": None,
        "last_error": None,
        "by_related_entity": {},
    }
    if connection is None:
        return base
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    sent_today_q = await db.execute(
        select(func.count(EmailLog.id)).where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
            EmailLog.status == "sent",
            EmailLog.created_at >= today_start,
        )
    )
    sent_total_q = await db.execute(
        select(func.count(EmailLog.id)).where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
            EmailLog.status == "sent",
        )
    )
    failed_today_q = await db.execute(
        select(func.count(EmailLog.id)).where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
            EmailLog.status == "failed",
            EmailLog.created_at >= today_start,
        )
    )
    failed_total_q = await db.execute(
        select(func.count(EmailLog.id)).where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
            EmailLog.status == "failed",
        )
    )
    base["emails_sent_today"] = int(sent_today_q.scalar() or 0)
    base["emails_sent_total"] = int(sent_total_q.scalar() or 0)
    base["emails_failed_today"] = int(failed_today_q.scalar() or 0)
    base["emails_failed_total"] = int(failed_total_q.scalar() or 0)

    last_sent_q = await db.execute(
        select(EmailLog.created_at)
        .where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
            EmailLog.status == "sent",
        )
        .order_by(EmailLog.created_at.desc())
        .limit(1)
    )
    last_sent = last_sent_q.scalar()
    base["last_sent_at"] = _iso(last_sent)

    last_err_q = await db.execute(
        select(EmailLog.error_message, EmailLog.created_at)
        .where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
            EmailLog.status == "failed",
        )
        .order_by(EmailLog.created_at.desc())
        .limit(1)
    )
    last_err = last_err_q.first()
    if last_err:
        base["last_error"] = {"message": last_err[0], "at": _iso(last_err[1])}

    by_entity_q = await db.execute(
        select(EmailLog.related_entity, func.count(EmailLog.id))
        .where(
            EmailLog.user_id == user_id,
            EmailLog.connection_id == connection.id,
        )
        .group_by(EmailLog.related_entity)
    )
    base["by_related_entity"] = {
        (row[0] or "unlinked"): int(row[1]) for row in by_entity_q.all()
    }
    return base


# ─── OpenAI ──────────────────────────────────────────────────────────────────


async def openai_metrics(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    base: dict[str, Any] = {
        "model": None,
        "requests_total": 0,
        "requests_today": 0,
        "tokens_total": 0,
        "tokens_today": 0,
        "cost_usd_total": 0.0,
        "cost_usd_today": 0.0,
        "avg_latency_ms": 0,
        "failures_today": 0,
        "last_request_at": None,
        "last_error": None,
    }
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    # Last model used.
    last_model_q = await db.execute(
        select(AiRequestLog.model, AiRequestLog.created_at)
        .where(AiRequestLog.user_id == user_id, AiRequestLog.provider == "openai")
        .order_by(AiRequestLog.created_at.desc())
        .limit(1)
    )
    last = last_model_q.first()
    if last:
        base["model"] = last[0]
        base["last_request_at"] = _iso(last[1])

    agg_q = await db.execute(
        select(
            func.count(AiRequestLog.id),
            func.coalesce(func.sum(AiRequestLog.total_tokens), 0),
            func.coalesce(func.sum(AiRequestLog.cost_usd), 0.0),
            func.coalesce(func.avg(AiRequestLog.latency_ms), 0),
        ).where(AiRequestLog.user_id == user_id, AiRequestLog.provider == "openai")
    )
    total, tokens, cost, latency = agg_q.first() or (0, 0, 0.0, 0)
    base["requests_total"] = int(total or 0)
    base["tokens_total"] = int(tokens or 0)
    base["cost_usd_total"] = round(float(cost or 0.0), 6)
    base["avg_latency_ms"] = int(latency or 0)

    today_q = await db.execute(
        select(
            func.count(AiRequestLog.id),
            func.coalesce(func.sum(AiRequestLog.total_tokens), 0),
            func.coalesce(func.sum(AiRequestLog.cost_usd), 0.0),
        ).where(
            AiRequestLog.user_id == user_id,
            AiRequestLog.provider == "openai",
            AiRequestLog.created_at >= today_start,
        )
    )
    today_count, today_tokens, today_cost = today_q.first() or (0, 0, 0.0)
    base["requests_today"] = int(today_count or 0)
    base["tokens_today"] = int(today_tokens or 0)
    base["cost_usd_today"] = round(float(today_cost or 0.0), 6)

    fail_q = await db.execute(
        select(func.count(AiRequestLog.id)).where(
            AiRequestLog.user_id == user_id,
            AiRequestLog.provider == "openai",
            AiRequestLog.status == AiRequestStatus.FAILED,
            AiRequestLog.created_at >= today_start,
        )
    )
    base["failures_today"] = int(fail_q.scalar() or 0)

    last_err_q = await db.execute(
        select(AiRequestLog.error_message, AiRequestLog.created_at)
        .where(
            AiRequestLog.user_id == user_id,
            AiRequestLog.provider == "openai",
            AiRequestLog.status == AiRequestStatus.FAILED,
        )
        .order_by(AiRequestLog.created_at.desc())
        .limit(1)
    )
    last_err = last_err_q.first()
    if last_err:
        base["last_error"] = {"message": last_err[0], "at": _iso(last_err[1])}
    return base


# ─── n8n ─────────────────────────────────────────────────────────────────────


async def n8n_metrics(
    db: AsyncSession, user_id: uuid.UUID, connection: IntegrationConnection | None
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "instance_url": None,
        "version": None,
        "imported_workflows": 0,
        "executions_total": 0,
        "executions_successful": 0,
        "executions_failed": 0,
        "last_execution_at": None,
        "last_execution_status": None,
    }
    if connection is None:
        return base
    base["instance_url"] = connection.connection_metadata.get("base_url") or connection.external_id
    base["version"] = connection.connection_metadata.get("version")

    # Imported workflow rows.
    from app.models.integration_platform import WorkflowImport

    imported_q = await db.execute(
        select(func.count(WorkflowImport.id), func.max(WorkflowImport.created_at)).where(
            WorkflowImport.user_id == user_id,
            WorkflowImport.connection_id == connection.id,
        )
    )
    total, last_imported = imported_q.first() or (0, None)
    base["imported_workflows"] = int(total or 0)
    if last_imported and (not base.get("last_execution_at") or last_imported > base["last_execution_at"]):
        base["last_execution_at"] = _iso(last_imported)

    # Step executions that ran through n8n.
    n8n_steps_q = await db.execute(
        select(
            func.count(StepExecution.id),
            func.sum(case((StepExecution.status == "completed", 1), else_=0)),
            func.sum(case((StepExecution.status == "failed", 1), else_=0)),
        ).where(
            StepExecution.user_id == user_id,
            StepExecution.integration_provider == "n8n",
        )
    )
    exec_total, ok, fail = n8n_steps_q.first() or (0, 0, 0)
    base["executions_total"] = int(exec_total or 0)
    base["executions_successful"] = int(ok or 0)
    base["executions_failed"] = int(fail or 0)

    last_step_q = await db.execute(
        select(StepExecution.status, StepExecution.completed_at)
        .where(
            StepExecution.user_id == user_id,
            StepExecution.integration_provider == "n8n",
        )
        .order_by(StepExecution.completed_at.desc().nullslast())
        .limit(1)
    )
    last_step = last_step_q.first()
    if last_step:
        base["last_execution_status"] = last_step[0]
        base["last_execution_at"] = _iso(last_step[1])
    return base


# ─── Webhooks ────────────────────────────────────────────────────────────────


async def webhook_metrics(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    endpoints_q = await db.execute(
        select(
            func.count(WebhookEndpoint.id),
            func.sum(case((WebhookEndpoint.direction == "incoming", 1), else_=0)),
            func.sum(case((WebhookEndpoint.direction == "outgoing", 1), else_=0)),
            func.sum(case((WebhookEndpoint.is_active.is_(True), 1), else_=0)),
        ).where(WebhookEndpoint.user_id == user_id)
    )
    total, incoming, outgoing, active = endpoints_q.first() or (0, 0, 0, 0)

    deliveries_q = await db.execute(
        select(
            func.count(WebhookLog.id),
            func.sum(case((WebhookLog.status == WebhookLogStatus.SUCCESS, 1), else_=0)),
            func.sum(case((WebhookLog.status == WebhookLogStatus.FAILED, 1), else_=0)),
            func.coalesce(func.sum(WebhookLog.retry_count), 0),
        ).where(WebhookLog.user_id == user_id)
    )
    total_deliveries, success_deliveries, failed_deliveries, retries = deliveries_q.first() or (0, 0, 0, 0)

    last_event_q = await db.execute(
        select(WebhookLog.created_at, WebhookLog.status)
        .where(WebhookLog.user_id == user_id)
        .order_by(WebhookLog.created_at.desc())
        .limit(1)
    )
    last_event = last_event_q.first()
    return {
        "endpoints_total": int(total or 0),
        "endpoints_incoming": int(incoming or 0),
        "endpoints_outgoing": int(outgoing or 0),
        "endpoints_active": int(active or 0),
        "deliveries_total": int(total_deliveries or 0),
        "deliveries_success": int(success_deliveries or 0),
        "deliveries_failed": int(failed_deliveries or 0),
        "retries_total": int(retries or 0),
        "last_event_at": _iso(last_event[0]) if last_event else None,
        "last_event_status": last_event[1].value if last_event and last_event[1] else None,
    }


# ─── Public API ──────────────────────────────────────────────────────────────


async def all_metrics(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    connections = await connection_service.list_connections(db, user_id)
    by_slug: dict[str, IntegrationConnection] = {}
    for conn, integration in connections:
        status = conn.status.value if hasattr(conn.status, "value") else str(conn.status)
        if status.upper() == "CONNECTED" and integration.slug not in by_slug:
            by_slug[integration.slug] = conn

    return {
        "google_sheets": await google_sheets_metrics(db, user_id, by_slug.get("google_sheets")),
        "notion": await notion_metrics(db, user_id, by_slug.get("notion")),
        "gmail": await gmail_metrics(db, user_id, by_slug.get("gmail")),
        "openai": await openai_metrics(db, user_id),
        "n8n": await n8n_metrics(db, user_id, by_slug.get("n8n")),
        "webhooks": await webhook_metrics(db, user_id),
        "generated_at": _iso(datetime.now(UTC)),
    }