"""SQLAlchemy filter helpers for GraphQL list resolvers."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Select, asc, desc, or_

from app.graphql.pagination import CrmListFilter, SortDirection


def apply_crm_filters(
    stmt: Select[Any],
    model: Any,
    filters: CrmListFilter | None,
    *,
    search_fields: list[Any] | None = None,
    status_field: Any | None = None,
) -> Select[Any]:
    if filters is None:
        return stmt.order_by(desc(model.updated_at))

    if filters.status and status_field is not None:
        stmt = stmt.where(status_field == filters.status)

    if filters.created_after is not None:
        stmt = stmt.where(model.created_at >= filters.created_after)
    if filters.created_before is not None:
        stmt = stmt.where(model.created_at <= filters.created_before)

    if filters.search and search_fields:
        pattern = f"%{filters.search.strip()}%"
        stmt = stmt.where(or_(*[field.ilike(pattern) for field in search_fields]))

    sort_col = getattr(model, filters.sort_by, model.updated_at)
    ordering = asc(sort_col) if filters.sort_direction == SortDirection.ASC else desc(sort_col)
    return stmt.order_by(ordering)
