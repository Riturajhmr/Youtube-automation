"""create youtube upload settings

Revision ID: 007
Revises: 006
Create Date: 2026-06-25

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "youtube_upload_settings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("video_id", sa.String(255), nullable=False),
        sa.Column("audience", sa.String(30), server_default="not_made_for_kids", nullable=False),
        sa.Column("ai_disclosure", sa.String(50), server_default="none", nullable=False),
        sa.Column("category_id", sa.String(10), nullable=True),
        sa.Column("license", sa.String(20), server_default="youtube", nullable=False),
        sa.Column("allow_embedding", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("allow_remixing", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("notify_subscribers", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("automatic_chapters", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("automatic_places", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("automatic_concepts", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("recording_date", sa.Date(), nullable=True),
        sa.Column("recording_location", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "video_id", name="uq_upload_settings_user_video"),
    )
    op.create_index(
        "ix_youtube_upload_settings_user_id",
        "youtube_upload_settings",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_youtube_upload_settings_user_id", table_name="youtube_upload_settings")
    op.drop_table("youtube_upload_settings")
