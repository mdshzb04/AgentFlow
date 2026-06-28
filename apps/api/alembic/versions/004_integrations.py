"""integration tables

Revision ID: 004
Revises: 003
Create Date: 2026-06-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "provider",
            sa.Enum("gmail", "slack", "google_sheets", "webhook", name="integration_provider", native_enum=False),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("external_account_id", sa.String(length=255), nullable=True),
        sa.Column("account_email", sa.String(length=255), nullable=True),
        sa.Column("credentials", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "expired", "revoked", name="account_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_integration_accounts_user_id"), "integration_accounts", ["user_id"], unique=False
    )

    op.create_table(
        "workflow_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "running", "completed", "failed", name="workflow_execution_status", native_enum=False),
            nullable=False,
        ),
        sa.Column("trigger_type", sa.String(length=32), nullable=False),
        sa.Column("input_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_workflow_executions_user_id"), "workflow_executions", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_workflow_executions_workflow_id"),
        "workflow_executions",
        ["workflow_id"],
        unique=False,
    )

    op.create_table(
        "step_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_execution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("node_id", sa.String(length=128), nullable=False),
        sa.Column("node_type", sa.String(length=64), nullable=False),
        sa.Column("integration_provider", sa.String(length=32), nullable=True),
        sa.Column("integration_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("input_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("output_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["integration_account_id"], ["integration_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_execution_id"], ["workflow_executions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_step_executions_workflow_execution_id"),
        "step_executions",
        ["workflow_execution_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_step_executions_user_id"), "step_executions", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_step_executions_user_id"), table_name="step_executions")
    op.drop_index(op.f("ix_step_executions_workflow_execution_id"), table_name="step_executions")
    op.drop_table("step_executions")
    op.drop_index(op.f("ix_workflow_executions_workflow_id"), table_name="workflow_executions")
    op.drop_index(op.f("ix_workflow_executions_user_id"), table_name="workflow_executions")
    op.drop_table("workflow_executions")
    op.drop_index(op.f("ix_integration_accounts_user_id"), table_name="integration_accounts")
    op.drop_table("integration_accounts")
    op.execute("DROP TYPE IF EXISTS workflow_execution_status")
    op.execute("DROP TYPE IF EXISTS account_status")
    op.execute("DROP TYPE IF EXISTS integration_provider")
