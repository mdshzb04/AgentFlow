"""GraphQL enums with lowercase value names matching the frontend codegen schema."""

from __future__ import annotations

import enum
from typing import Any

import strawberry


@strawberry.enum(name="LeadStatus")
class GqlLeadStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    converted = "converted"
    lost = "lost"


@strawberry.enum(name="DealStage")
class GqlDealStage(str, enum.Enum):
    prospecting = "prospecting"
    qualification = "qualification"
    proposal = "proposal"
    negotiation = "negotiation"
    closed_won = "closed_won"
    closed_lost = "closed_lost"


@strawberry.enum(name="TaskStatus")
class GqlTaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


@strawberry.enum(name="TaskPriority")
class GqlTaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


_GQL_ENUM_BY_NAME = {
    "LeadStatus": GqlLeadStatus,
    "DealStage": GqlDealStage,
    "TaskStatus": GqlTaskStatus,
    "TaskPriority": GqlTaskPriority,
}


def to_gql_enum(value: Any, gql_enum_cls: type[enum.Enum]) -> enum.Enum | None:
    """Convert a SQLAlchemy model enum (or raw value) to the matching GraphQL enum."""
    if value is None:
        return None
    raw = value.value if hasattr(value, "value") else value
    try:
        return gql_enum_cls(raw)
    except ValueError:
        # Fall back to name-based lookup for safety.
        return gql_enum_cls[str(raw).upper()]
