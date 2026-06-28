from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import UploadFile

from app.core.exceptions import VideoProcessingError
from app.core.logging import get_logger
from app.schemas.metadata import ChannelProfile, MetadataGenerateRequest
from app.schemas.video import VideoUploadResponse
from app.services.content_type_service import ContentTypeService
from app.services.frame_extraction_service import FrameExtractionService
from app.services.metadata_engine import MetadataEngine
from app.services.transcript_service import TranscriptResult, TranscriptService
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
    # Raw bytes of an uploaded thumbnail image (JPEG/PNG/WebP).
    thumbnail_bytes: Optional[bytes] = None
    # MIME type of the thumbnail (e.g. "image/png", "image/jpeg", "image/webp").
    thumbnail_content_type: Optional[str] = None


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
        content_type: ContentTypeService,
    ) -> None:
        self._upload = upload
        self._transcript = transcript
        self._frames = frames
        self._engine = engine
        self._content_type = content_type

    async def process(
        self,
        file: UploadFile,
        context: Optional[VideoUploadContext] = None,
    ) -> VideoUploadResponse:
        """
        Run the full pipeline:
          Save → Detect Content Type → Transcript → Frames → Metadata → Response

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

        # Save thumbnail bytes alongside the video so publishing can upload it later (non-fatal)
        if ctx.thumbnail_bytes:
            _mime_to_ext = {"image/png": ".png", "image/webp": ".webp", "image/jpeg": ".jpg"}
            _thumb_ext = _mime_to_ext.get(ctx.thumbnail_content_type or "", ".jpg")
            thumbnail_path = video_path.parent / f"{video_id}_thumbnail{_thumb_ext}"
            try:
                import aiofiles  # type: ignore[import-untyped]
                async with aiofiles.open(thumbnail_path, "wb") as f:
                    await f.write(ctx.thumbnail_bytes)
                logger.info(
                    "Thumbnail persisted for publishing",
                    extra={"video_id": video_id, "path": str(thumbnail_path)},
                )
            except Exception as exc:
                logger.warning(
                    "Thumbnail persist failed (non-fatal): %s", exc,
                    extra={"video_id": video_id},
                )

        # Stage 1b: detect content type (non-fatal — defaults to "video" on error)
        media_info = await self._content_type.analyze(video_path)
        is_short = media_info.content_type == "short"
        logger.info(
            "Content type analysis complete",
            extra={
                "video_id": video_id,
                "content_type": media_info.content_type,
                "duration_seconds": media_info.duration_seconds,
                "width": media_info.width,
                "height": media_info.height,
                "aspect_ratio": media_info.aspect_ratio,
            },
        )

        # Stage 2+3: transcript and frame extraction run in parallel to reduce latency
        t_parallel = time.monotonic()

        async def _get_transcript() -> TranscriptResult:
            if ctx.provided_transcript:
                logger.info("Using provided transcript", extra={"video_id": video_id})
                return TranscriptResult(text=ctx.provided_transcript, detected_language=None)
            return await self._transcript.extract(video_path, video_id)

        parallel_results = await asyncio.gather(
            _get_transcript(),
            self._frames.extract_frames(video_path),
            return_exceptions=True,
        )

        transcript_result, extracted_frames = parallel_results[0], parallel_results[1]

        if isinstance(transcript_result, Exception):
            raise VideoProcessingError(
                message=f"Transcript extraction failed: {transcript_result}",
                code="VIDEO_TRANSCRIPT_ERROR",
                stage="transcript",
            ) from transcript_result

        if isinstance(extracted_frames, Exception):
            raise VideoProcessingError(
                message=f"Frame extraction failed: {extracted_frames}",
                code="VIDEO_FRAME_ERROR",
                stage="frames",
            ) from extracted_frames

        logger.info(
            "Parallel transcript + frame extraction complete",
            extra={
                "video_id": video_id,
                "frame_count": len(extracted_frames),
                "detected_language_whisper": transcript_result.detected_language,
                "transcript_length": len(transcript_result.text),
                "parallel_duration_seconds": round(time.monotonic() - t_parallel, 2),
            },
        )

        # Prepend thumbnail to frames so Claude sees it first (most important visual)
        all_images: List[bytes] = []
        if ctx.thumbnail_bytes:
            all_images.append(ctx.thumbnail_bytes)
        all_images.extend(extracted_frames)

        # Stage 4: metadata generation with all available context
        try:
            metadata_req = MetadataGenerateRequest(
                transcript=transcript_result.text,
                title_hint=ctx.title_hint,
                target_keywords=ctx.target_keywords,
                channel_profile=ctx.channel_profile,
                video_description=ctx.video_description,
                extra_context=ctx.extra_context,
            )
            metadata = await self._engine.generate_metadata(
                metadata_req,
                frames=all_images or None,
                is_short=is_short,
                detected_language=transcript_result.detected_language,
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
            content_type=media_info.content_type,  # type: ignore[arg-type]
            duration_seconds=media_info.duration_seconds if media_info.duration_seconds > 0 else None,
            width=media_info.width if media_info.width > 0 else None,
            height=media_info.height if media_info.height > 0 else None,
            aspect_ratio=media_info.aspect_ratio if media_info.width > 0 else None,
        )
