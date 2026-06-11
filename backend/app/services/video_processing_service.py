from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import UploadFile

from app.core.exceptions import VideoProcessingError
from app.core.logging import get_logger
from app.schemas.metadata import ChannelProfile, MetadataGenerateRequest
from app.schemas.video import VideoUploadResponse
from app.services.frame_extraction_service import FrameExtractionService
from app.services.metadata_engine import MetadataEngine
from app.services.transcript_service import TranscriptService
from app.services.video_upload_service import VideoUploadService

logger = get_logger(__name__)


@dataclass
class VideoUploadContext:
    """
    Optional creator-supplied context that enriches metadata generation.
    Passed alongside the video file to VideoProcessingService.process().
    """
    title_hint: Optional[str] = None
    target_keywords: Optional[List[str]] = None
    video_description: Optional[str] = None
    extra_context: Optional[str] = None
    channel_profile: Optional[ChannelProfile] = None
    # If set, Whisper is skipped and this text is used as the transcript directly.
    provided_transcript: Optional[str] = None
    # Raw bytes of an uploaded thumbnail image (JPEG/PNG).
    thumbnail_bytes: Optional[bytes] = None


def _parse_transcript_file(content: str, filename: str) -> str:
    """
    Convert a plain-text, SRT, or VTT transcript file to clean plain text.
    Strips timing lines, sequence numbers, and formatting tags.
    """
    lower = filename.lower()
    if lower.endswith(".srt"):
        # Remove sequence numbers (lone integers), timestamp lines, and HTML tags
        text = re.sub(r"^\d+\s*$", "", content, flags=re.MULTILINE)
        text = re.sub(r"\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}", "", text)
        text = re.sub(r"<[^>]+>", "", text)
    elif lower.endswith(".vtt"):
        # Remove WEBVTT header, NOTE blocks, cue timestamps, and tags
        text = re.sub(r"^WEBVTT.*$", "", content, flags=re.MULTILINE)
        text = re.sub(r"^NOTE\b.*$", "", content, flags=re.MULTILINE)
        text = re.sub(r"\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$", "", text, flags=re.MULTILINE)
        text = re.sub(r"<[^>]+>", "", text)
    else:
        text = content

    # Collapse whitespace and blank lines
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return " ".join(lines)


class VideoProcessingService:
    def __init__(
        self,
        upload: VideoUploadService,
        transcript: TranscriptService,
        frames: FrameExtractionService,
        engine: MetadataEngine,
    ) -> None:
        self._upload = upload
        self._transcript = transcript
        self._frames = frames
        self._engine = engine

    async def process(
        self,
        file: UploadFile,
        context: Optional[VideoUploadContext] = None,
    ) -> VideoUploadResponse:
        """
        Run the full pipeline:
          Save → Transcript → Frames → Metadata → Response

        VideoUploadError (client fault) propagates directly → 400.
        All other pipeline failures are wrapped in VideoProcessingError → 500.
        """
        ctx = context or VideoUploadContext()
        original_filename = file.filename or "upload"

        logger.info(
            "Video processing started",
            extra={
                "video_filename": original_filename,
                "transcript_source": "provided" if ctx.provided_transcript else "auto",
                "has_thumbnail": ctx.thumbnail_bytes is not None,
                "has_title_hint": ctx.title_hint is not None,
                "keyword_count": len(ctx.target_keywords) if ctx.target_keywords else 0,
            },
        )

        # Stage 1: validate and save (VideoUploadError propagates as-is → 400)
        video_id, video_path = await self._upload.save(file)

        # Stage 2: transcript — use provided text or auto-generate via Whisper
        if ctx.provided_transcript:
            transcript = ctx.provided_transcript
            logger.info("Using provided transcript", extra={"video_id": video_id})
        else:
            try:
                transcript = await self._transcript.extract(video_path, video_id)
            except Exception as exc:
                raise VideoProcessingError(
                    message=f"Transcript extraction failed: {exc}",
                    code="VIDEO_TRANSCRIPT_ERROR",
                    stage="transcript",
                ) from exc

        # Stage 3: frame extraction
        try:
            extracted_frames = await self._frames.extract_frames(video_path)
        except Exception as exc:
            raise VideoProcessingError(
                message=f"Frame extraction failed: {exc}",
                code="VIDEO_FRAME_ERROR",
                stage="frames",
            ) from exc

        logger.info(
            "Frame extraction complete",
            extra={"video_id": video_id, "frame_count": len(extracted_frames)},
        )

        # Prepend thumbnail to frames so Claude sees it first (most important visual)
        all_images: List[bytes] = []
        if ctx.thumbnail_bytes:
            all_images.append(ctx.thumbnail_bytes)
        all_images.extend(extracted_frames)

        # Stage 4: metadata generation with all available context
        try:
            metadata_req = MetadataGenerateRequest(
                transcript=transcript,
                title_hint=ctx.title_hint,
                target_keywords=ctx.target_keywords,
                channel_profile=ctx.channel_profile,
                video_description=ctx.video_description,
                extra_context=ctx.extra_context,
            )
            metadata = await self._engine.generate_metadata(
                metadata_req,
                frames=all_images or None,
            )
        except Exception as exc:
            raise VideoProcessingError(
                message=f"Metadata generation failed: {exc}",
                code="VIDEO_METADATA_ERROR",
                stage="metadata",
            ) from exc

        logger.info(
            "Video processing complete",
            extra={"video_id": video_id, "video_filename": original_filename},
        )

        return VideoUploadResponse(
            video_id=video_id,
            filename=original_filename,
            status="processed",
            metadata=metadata,
        )
