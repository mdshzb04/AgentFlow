"""seed openai and notion integrations

Revision ID: 009
Revises: 008
Create Date: 2026-06-27

"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_INTEGRATIONS = [
    ("openai", "OpenAI", "api_key"),
    ("notion", "Notion", "api_key"),
]


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.now(UTC)
    for slug, name, auth_type in NEW_INTEGRATIONS:
        exists = conn.execute(
            sa.text("SELECT 1 FROM integrations WHERE slug = :slug"),
            {"slug": slug},
        ).fetchone()
        if not exists:
            conn.execute(
                sa.text(
                    "INSERT INTO integrations (id, slug, name, auth_type, is_active, created_at) "
                    "VALUES (:id, :slug, :name, :auth_type, true, :created_at)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "slug": slug,
                    "name": name,
                    "auth_type": auth_type,
                    "created_at": now,
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    for slug, _, _ in NEW_INTEGRATIONS:
        conn.execute(sa.text("DELETE FROM integrations WHERE slug = :slug"), {"slug": slug})
