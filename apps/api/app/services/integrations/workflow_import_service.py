"""n8n workflow import tracking."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration_platform import SyncJob, SyncJobStatus, WorkflowImport
from app.models.workflow import Workflow


class WorkflowImportService:
    async def record_import(
        self,
        db: AsyncSession,
        *,
        connection_id: uuid.UUID,
        user_id: uuid.UUID,
        workflow: Workflow,
        remote_workflow_id: str | None,
        remote_workflow_name: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> WorkflowImport:
        record = WorkflowImport(
            connection_id=connection_id,
            user_id=user_id,
            workflow_id=workflow.id,
            remote_workflow_id=remote_workflow_id,
            remote_workflow_name=remote_workflow_name,
            import_metadata=metadata or {},
        )
        db.add(record)
        await db.flush()
        return record

    async def start_sync_job(
        self,
        db: AsyncSession,
        *,
        connection_id: uuid.UUID,
        user_id: uuid.UUID,
        job_type: str,
    ) -> SyncJob:
        job = SyncJob(
            connection_id=connection_id,
            user_id=user_id,
            job_type=job_type,
            status=SyncJobStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        db.add(job)
        await db.flush()
        return job

    async def complete_sync_job(
        self,
        db: AsyncSession,
        job: SyncJob,
        *,
        success: bool,
        result: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> SyncJob:
        job.status = SyncJobStatus.COMPLETED if success else SyncJobStatus.FAILED
        job.result = result or {}
        job.error_message = error_message
        job.completed_at = datetime.now(UTC)
        await db.flush()
        return job


workflow_import_service = WorkflowImportService()
