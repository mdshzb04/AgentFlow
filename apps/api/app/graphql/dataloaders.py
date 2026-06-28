"""DataLoaders to batch nested relationship queries and avoid N+1."""

from __future__ import annotations

import uuid
from collections import defaultdict

from aiodataloader import DataLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Company, Contact, Deal, Lead, Note, Task
from app.models.integration import WorkflowExecution


class DataLoaders:
    def __init__(self, db: AsyncSession, user_id: uuid.UUID) -> None:
        self.db = db
        self.user_id = user_id

        self.company_by_id = DataLoader(self._load_company_by_id)
        self.contacts_by_company = DataLoader(self._load_contacts_by_company)
        self.deals_by_company = DataLoader(self._load_deals_by_company)
        self.leads_by_company = DataLoader(self._load_leads_by_company)
        self.tasks_by_deal = DataLoader(self._load_tasks_by_deal)
        self.notes_by_related = DataLoader(self._load_notes_by_related)
        self.executions_by_workflow = DataLoader(self._load_executions_by_workflow)

    async def _load_company_by_id(self, keys: list[uuid.UUID]) -> list[Company | None]:
        result = await self.db.execute(
            select(Company).where(Company.user_id == self.user_id, Company.id.in_(keys))
        )
        by_id = {row.id: row for row in result.scalars()}
        return [by_id.get(key) for key in keys]

    async def _load_contacts_by_company(self, keys: list[uuid.UUID]) -> list[list[Contact]]:
        result = await self.db.execute(
            select(Contact).where(
                Contact.user_id == self.user_id,
                Contact.company_id.in_(keys),
            )
        )
        grouped: dict[uuid.UUID, list[Contact]] = defaultdict(list)
        for row in result.scalars():
            if row.company_id:
                grouped[row.company_id].append(row)
        return [grouped.get(key, []) for key in keys]

    async def _load_deals_by_company(self, keys: list[uuid.UUID]) -> list[list[Deal]]:
        result = await self.db.execute(
            select(Deal).where(Deal.user_id == self.user_id, Deal.company_id.in_(keys))
        )
        grouped: dict[uuid.UUID, list[Deal]] = defaultdict(list)
        for row in result.scalars():
            if row.company_id:
                grouped[row.company_id].append(row)
        return [grouped.get(key, []) for key in keys]

    async def _load_leads_by_company(self, keys: list[uuid.UUID]) -> list[list[Lead]]:
        result = await self.db.execute(
            select(Lead).where(Lead.user_id == self.user_id, Lead.company_id.in_(keys))
        )
        grouped: dict[uuid.UUID, list[Lead]] = defaultdict(list)
        for row in result.scalars():
            if row.company_id:
                grouped[row.company_id].append(row)
        return [grouped.get(key, []) for key in keys]

    async def _load_tasks_by_deal(self, keys: list[uuid.UUID]) -> list[list[Task]]:
        key_strs = [str(k) for k in keys]
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == self.user_id,
                Task.related_type == "deal",
                Task.related_id.in_(keys),
            )
        )
        grouped: dict[str, list[Task]] = defaultdict(list)
        for row in result.scalars():
            if row.related_id:
                grouped[str(row.related_id)].append(row)
        return [grouped.get(str(key), []) for key in keys]

    async def _load_notes_by_related(
        self, keys: list[tuple[str, uuid.UUID]]
    ) -> list[list[Note]]:
        if not keys:
            return []
        related_type = keys[0][0]
        ids = [key[1] for key in keys]
        result = await self.db.execute(
            select(Note).where(
                Note.user_id == self.user_id,
                Note.related_type == related_type,
                Note.related_id.in_(ids),
            )
        )
        grouped: dict[uuid.UUID, list[Note]] = defaultdict(list)
        for row in result.scalars():
            grouped[row.related_id].append(row)
        return [grouped.get(key[1], []) for key in keys]

    async def _load_executions_by_workflow(
        self, keys: list[uuid.UUID]
    ) -> list[list[WorkflowExecution]]:
        result = await self.db.execute(
            select(WorkflowExecution)
            .where(
                WorkflowExecution.user_id == self.user_id,
                WorkflowExecution.workflow_id.in_(keys),
            )
            .order_by(WorkflowExecution.started_at.desc())
        )
        grouped: dict[uuid.UUID, list[WorkflowExecution]] = defaultdict(list)
        for row in result.scalars():
            if row.workflow_id:
                grouped[row.workflow_id].append(row)
        return [grouped.get(key, []) for key in keys]
