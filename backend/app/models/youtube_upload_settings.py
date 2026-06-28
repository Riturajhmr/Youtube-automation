from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class YouTubeUploadSettings(Base):
    __tablename__ = "youtube_upload_settings"
    __table_args__ = (UniqueConstraint("user_id", "video_id", name="uq_upload_settings_user_video"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    video_id: Mapped[str] = mapped_column(String(255), nullable=False)

    audience: Mapped[str] = mapped_column(String(30), nullable=False, server_default="not_made_for_kids")
    ai_disclosure: Mapped[str] = mapped_column(String(50), nullable=False, server_default="none")
    category_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    license: Mapped[str] = mapped_column(String(20), nullable=False, server_default="youtube")
    allow_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    allow_remixing: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    notify_subscribers: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    automatic_chapters: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    automatic_places: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    automatic_concepts: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    recording_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    recording_location: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
        onupdate=lambda: datetime.now(timezone.utc),
    )
