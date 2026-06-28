"""Pagination, sorting, and filtering inputs for list queries."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Generic, TypeVar

import strawberry

T = TypeVar("T")


@strawberry.enum
class SortDirection(Enum):
    ASC = "asc"
    DESC = "desc"


@strawberry.input(description="Offset-based pagination.")
class PaginationInput:
    limit: int = 50
    offset: int = 0


@strawberry.input(description="Shared list filters for CRM entities.")
class CrmListFilter:
    search: str | None = None
    status: str | None = None
    sort_by: str = "updated_at"
    sort_direction: SortDirection = SortDirection.DESC
    created_after: datetime | None = None
    created_before: datetime | None = None


@strawberry.type(description="Page metadata for paginated lists.")
class PageInfo:
    total_count: int
    limit: int
    offset: int
    has_next_page: bool


@strawberry.type
class Connection(Generic[T]):
    nodes: list[T]
    page_info: PageInfo


def build_page_info(total: int, pagination: PaginationInput) -> PageInfo:
    limit = max(1, min(pagination.limit, 100))
    offset = max(0, pagination.offset)
    return PageInfo(
        total_count=total,
        limit=limit,
        offset=offset,
        has_next_page=offset + limit < total,
    )
