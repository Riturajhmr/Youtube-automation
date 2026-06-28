"""create youtube channel sessions

Revision ID: 006
Revises: 005
Create Date: 2026-06-25

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "youtube_channel_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_token_enc", sa.String(2048), nullable=False),
        sa.Column("refresh_token_enc", sa.String(2048), nullable=True),
        sa.Column("token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_channels", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_youtube_channel_sessions_user_id", "youtube_channel_sessions", ["user_id"])
    op.create_index("ix_youtube_channel_sessions_expires_at", "youtube_channel_sessions", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_youtube_channel_sessions_expires_at", table_name="youtube_channel_sessions")
    op.drop_index("ix_youtube_channel_sessions_user_id", table_name="youtube_channel_sessions")
    op.drop_table("youtube_channel_sessions")
