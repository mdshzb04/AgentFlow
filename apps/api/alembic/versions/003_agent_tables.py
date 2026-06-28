"""initial agent tables

Revision ID: 003
Revises: 002
Create Date: 2026-06-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prompt_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "category",
            sa.Enum(
                "lead_qualification",
                "email_generation",
                "meeting_summary",
                "custom",
                name="template_category",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("user_prompt_template", sa.Text(), nullable=False),
        sa.Column(
            "output_mode",
            sa.Enum("text", "json", name="output_mode", native_enum=False),
            nullable=False,
        ),
        sa.Column("json_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tools", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("default_provider", sa.String(length=32), nullable=False),
        sa.Column("default_model", sa.String(length=128), nullable=True),
        sa.Column("is_builtin", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_prompt_templates_user_id"), "prompt_templates", ["user_id"], unique=False
    )

    op.create_table(
        "agent_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("node_id", sa.String(length=128), nullable=True),
        sa.Column("template_slug", sa.String(length=128), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "running",
                "completed",
                "failed",
                name="execution_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("input_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("output_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tool_calls", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("steps", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("usage", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_agent_executions_user_id"), "agent_executions", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_agent_executions_workflow_id"),
        "agent_executions",
        ["workflow_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_agent_executions_workflow_id"), table_name="agent_executions")
    op.drop_index(op.f("ix_agent_executions_user_id"), table_name="agent_executions")
    op.drop_table("agent_executions")
    op.drop_index(op.f("ix_prompt_templates_user_id"), table_name="prompt_templates")
    op.drop_table("prompt_templates")
    op.execute("DROP TYPE IF EXISTS execution_status")
    op.execute("DROP TYPE IF EXISTS output_mode")
    op.execute("DROP TYPE IF EXISTS template_category")
