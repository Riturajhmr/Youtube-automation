from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.dependencies import VideoProcessingServiceDep
from app.schemas.video import VideoUploadResponse
from app.services.video_processing_service import VideoUploadContext, _parse_transcript_file

router = APIRouter(prefix="/videos", tags=["Video"])


@router.post(
    "/upload",
    response_model=VideoUploadResponse,
    status_code=200,
    summary="Upload and process a video file",
    description=(
        "Accepts a video file (mp4, mov, mkv, webm; max 2 GB) plus optional context fields. "
        "Runs the full processing pipeline: save → transcript → frames → metadata generation. "
        "Returns generated YouTube metadata alongside the video identifier.\n\n"
        "**Transcript source**: by default, audio is transcribed automatically via Whisper. "
        "To supply your own transcript, upload a .txt, .srt, or .vtt file via `transcript_file`.\n\n"
        "**Thumbnail**: optionally upload a thumbnail image (JPEG/PNG) to give the AI visual context "
        "in addition to the video frames."
    ),
)
async def upload_video(
    service: VideoProcessingServiceDep,
    # Required: the video file
    file: UploadFile = File(..., description="Video file to process (mp4, mov, mkv, webm; max 2 GB)"),
    # Optional metadata context
    title_hint: Optional[str] = Form(
        default=None,
        description="Creator's rough title idea — used as directional inspiration, not final.",
    ),
    target_keywords: Optional[str] = Form(
        default=None,
        description='JSON array or comma-separated keywords, e.g. ["python","fastapi"] or "python,fastapi".',
    ),
    video_description: Optional[str] = Form(
        default=None,
        description="Creator's existing or draft description — used as reference context.",
    ),
    extra_context: Optional[str] = Form(
        default=None,
        description="Any additional notes: target audience, tone goals, special instructions, etc.",
    ),
    # Optional transcript override
    transcript_file: Optional[UploadFile] = File(
        default=None,
        description="Optional transcript file (.txt, .srt, .vtt). If provided, Whisper is skipped.",
    ),
    # Optional thumbnail
    thumbnail: Optional[UploadFile] = File(
        default=None,
        description="Optional thumbnail image (JPEG/PNG) for additional visual context.",
    ),
) -> VideoUploadResponse:
    # Parse target_keywords: accept JSON array or comma-separated string
    parsed_keywords: Optional[List[str]] = None
    if target_keywords:
        stripped = target_keywords.strip()
        if stripped.startswith("["):
            try:
                parsed_keywords = json.loads(stripped)
            except json.JSONDecodeError:
                parsed_keywords = [k.strip() for k in stripped.strip("[]").split(",") if k.strip()]
        else:
            parsed_keywords = [k.strip() for k in stripped.split(",") if k.strip()]

    # Read provided transcript file
    provided_transcript: Optional[str] = None
    if transcript_file and transcript_file.filename:
        raw_bytes = await transcript_file.read()
        raw_text = raw_bytes.decode("utf-8", errors="replace")
        provided_transcript = _parse_transcript_file(raw_text, transcript_file.filename)
        # Pad to minimum length if the file is very short
        if len(provided_transcript) < 50:
            provided_transcript = provided_transcript + " " * (50 - len(provided_transcript))

    # Read thumbnail bytes
    thumbnail_bytes: Optional[bytes] = None
    thumbnail_content_type: Optional[str] = None
    if thumbnail and thumbnail.filename:
        thumbnail_bytes = await thumbnail.read()
        thumbnail_content_type = thumbnail.content_type or None

    context = VideoUploadContext(
        title_hint=title_hint or None,
        target_keywords=parsed_keywords,
        video_description=video_description or None,
        extra_context=extra_context or None,
        provided_transcript=provided_transcript,
        thumbnail_bytes=thumbnail_bytes,
        thumbnail_content_type=thumbnail_content_type,
    )

    return await service.process(file, context)
