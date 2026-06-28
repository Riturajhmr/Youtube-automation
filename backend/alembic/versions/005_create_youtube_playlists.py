"""create youtube playlists

Revision ID: 005
Revises: 004
Create Date: 2026-06-24

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "youtube_playlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("youtube_playlist_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("thumbnail_url", sa.String(1000), nullable=True),
        sa.Column("item_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "youtube_playlist_id", name="uq_user_playlist"),
    )
    op.create_index(
        "ix_youtube_playlists_user_id",
        "youtube_playlists",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_youtube_playlists_user_id", table_name="youtube_playlists")
    op.drop_table("youtube_playlists")
