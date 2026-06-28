"""integration platform tables

Revision ID: 008
Revises: 007
Create Date: 2026-06-27

"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INTEGRATION_SEEDS = [
    ("gmail", "Gmail", "oauth"),
    ("slack", "Slack", "oauth"),
    ("google_sheets", "Google Sheets", "oauth"),
    ("n8n", "n8n", "api_key"),
    ("webhooks", "Webhooks", "secret"),
]


def upgrade() -> None:
    op.create_table(
        "integrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("auth_type", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "integration_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("integration_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("legacy_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("account_email", sa.String(length=255), nullable=True),
        sa.Column("external_id", sa.String(length=512), nullable=True),
        sa.Column(
            "status",
            sa.Enum("connected", "disconnected", "error", "expired", name="connection_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("health_status", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["integration_id"], ["integrations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["legacy_account_id"], ["integration_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_connections_user_id", "integration_connections", ["user_id"])

    op.create_table(
        "oauth_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_token_encrypted", sa.Text(), nullable=False),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
        sa.Column("token_type", sa.String(length=32), nullable=False, server_default="Bearer"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("connection_id"),
    )

    op.create_table(
        "encrypted_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ciphertext", sa.Text(), nullable=False),
        sa.Column("key_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("connection_id"),
    )

    op.create_table(
        "webhook_endpoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "direction",
            sa.Enum("incoming", "outgoing", name="webhook_direction", native_enum=False),
            nullable=False,
        ),
        sa.Column("url_token", sa.String(length=64), nullable=False),
        sa.Column("secret_hash", sa.String(length=128), nullable=False),
        sa.Column("target_url", sa.Text(), nullable=True),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("url_token"),
    )
    op.create_index("ix_webhook_endpoints_user_id", "webhook_endpoints", ["user_id"])

    op.create_table(
        "webhook_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("endpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "direction",
            sa.Enum("incoming", "outgoing", name="webhook_log_direction", native_enum=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "success", "failed", name="webhook_log_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("request_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("response_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["endpoint_id"], ["webhook_endpoints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_webhook_logs_endpoint_id", "webhook_logs", ["endpoint_id"])
    op.create_index("ix_webhook_logs_user_id", "webhook_logs", ["user_id"])

    op.create_table(
        "sync_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_type", sa.String(length=64), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "running", "completed", "failed", name="sync_job_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sync_jobs_connection_id", "sync_jobs", ["connection_id"])

    op.create_table(
        "workflow_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("remote_workflow_id", sa.String(length=128), nullable=True),
        sa.Column("remote_workflow_name", sa.String(length=255), nullable=True),
        sa.Column("import_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workflow_imports_connection_id", "workflow_imports", ["connection_id"])

    op.create_table(
        "integration_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connection_id"], ["integration_connections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_audit_logs_user_id", "integration_audit_logs", ["user_id"])

    # Seed integration catalog
    conn = op.get_bind()
    now = datetime.now(UTC)
    integration_ids: dict[str, str] = {}
    for slug, name, auth_type in INTEGRATION_SEEDS:
        iid = str(uuid.uuid4())
        integration_ids[slug] = iid
        conn.execute(
            sa.text(
                "INSERT INTO integrations (id, slug, name, auth_type, is_active, created_at) "
                "VALUES (:id, :slug, :name, :auth_type, true, :created_at)"
            ),
            {"id": iid, "slug": slug, "name": name, "auth_type": auth_type, "created_at": now},
        )

    # Backfill connections from legacy integration_accounts
    rows = conn.execute(
        sa.text(
            "SELECT id, user_id, provider, name, external_account_id, account_email, "
            "credentials, metadata, status, created_at, updated_at FROM integration_accounts"
        )
    ).fetchall()

    slug_map = {
        "gmail": "gmail",
        "slack": "slack",
        "google_sheets": "google_sheets",
        "webhook": "webhooks",
        "n8n": "n8n",
    }
    status_map = {"active": "connected", "expired": "expired", "revoked": "disconnected"}

    for row in rows:
        provider = row.provider
        slug = slug_map.get(provider)
        if not slug or slug not in integration_ids:
            continue
        conn_id = str(row.id)
        conn.execute(
            sa.text(
                "INSERT INTO integration_connections "
                "(id, user_id, integration_id, legacy_account_id, display_name, account_email, "
                "external_id, status, health_status, last_sync_at, metadata, created_at, updated_at) "
                "VALUES (:id, :user_id, :integration_id, :legacy_account_id, :display_name, "
                ":account_email, :external_id, :status, 'healthy', :last_sync_at, "
                "CAST(:metadata AS jsonb), :created_at, :updated_at)"
            ),
            {
                "id": conn_id,
                "user_id": str(row.user_id),
                "integration_id": integration_ids[slug],
                "legacy_account_id": str(row.id),
                "display_name": row.name,
                "account_email": row.account_email,
                "external_id": row.external_account_id,
                "status": status_map.get(row.status, "connected"),
                "last_sync_at": row.updated_at,
                "metadata": json.dumps(row.metadata or {}),
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            },
        )
        # Store credentials as encrypted placeholder (migration uses plaintext JSON in legacy)
        creds = row.credentials or {}
        if creds:
            conn.execute(
                sa.text(
                    "INSERT INTO encrypted_credentials "
                    "(id, connection_id, ciphertext, key_version, created_at, updated_at) "
                    "VALUES (:id, :connection_id, :ciphertext, 0, :now, :now)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "connection_id": conn_id,
                    "ciphertext": json.dumps(creds),
                    "now": now,
                },
            )


def downgrade() -> None:
    op.drop_index("ix_integration_audit_logs_user_id", table_name="integration_audit_logs")
    op.drop_table("integration_audit_logs")
    op.drop_index("ix_workflow_imports_connection_id", table_name="workflow_imports")
    op.drop_table("workflow_imports")
    op.drop_index("ix_sync_jobs_connection_id", table_name="sync_jobs")
    op.drop_table("sync_jobs")
    op.drop_index("ix_webhook_logs_user_id", table_name="webhook_logs")
    op.drop_index("ix_webhook_logs_endpoint_id", table_name="webhook_logs")
    op.drop_table("webhook_logs")
    op.drop_index("ix_webhook_endpoints_user_id", table_name="webhook_endpoints")
    op.drop_table("webhook_endpoints")
    op.drop_table("encrypted_credentials")
    op.drop_table("oauth_tokens")
    op.drop_index("ix_integration_connections_user_id", table_name="integration_connections")
    op.drop_table("integration_connections")
    op.drop_table("integrations")
    op.execute("DROP TYPE IF EXISTS connection_status")
    op.execute("DROP TYPE IF EXISTS webhook_direction")
    op.execute("DROP TYPE IF EXISTS webhook_log_direction")
    op.execute("DROP TYPE IF EXISTS webhook_log_status")
    op.execute("DROP TYPE IF EXISTS sync_job_status")
