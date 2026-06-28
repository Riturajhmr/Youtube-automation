"""add content_type to youtube_publications

Revision ID: 004
Revises: 003
Create Date: 2026-06-15

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "youtube_publications",
        sa.Column(
            "content_type",
            sa.String(10),
            nullable=False,
            server_default=sa.text("'video'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("youtube_publications", "content_type")
