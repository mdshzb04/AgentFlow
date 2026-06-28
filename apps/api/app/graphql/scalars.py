"""GraphQL scalar types."""

from __future__ import annotations

from datetime import date, datetime

import strawberry


@strawberry.scalar(
    description="ISO-8601 date (YYYY-MM-DD).",
    serialize=lambda v: v.isoformat() if isinstance(v, date) else v,
    parse_value=lambda v: date.fromisoformat(v) if isinstance(v, str) else v,
)
class DateScalar:
    pass


@strawberry.scalar(
    description="ISO-8601 datetime.",
    serialize=lambda v: v.isoformat() if isinstance(v, datetime) else v,
    parse_value=lambda v: datetime.fromisoformat(v) if isinstance(v, str) else v,
)
class DateTimeScalar:
    pass
