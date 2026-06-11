from __future__ import annotations

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

# Videos shorter than this get a single midpoint frame instead of num_frames.
_SHORT_VIDEO_SECONDS = 3.0


class FrameExtractionService(ABC):
    @abstractmethod
    async def extract_frames(self, video_path: Path, num_frames: int = 3) -> List[bytes]:
        """Extract representative frames from a video file as raw JPEG bytes."""

    @property
    @abstractmethod
    def service_name(self) -> str:
        """Human-readable name of this service."""


class PlaceholderFrameExtractionService(FrameExtractionService):
    """
    Returns an empty list — ready to swap in FFmpeg/OpenCV.

    MetadataGenerateRequest does not yet accept frames, so this is a
    forward-compatible no-op that keeps the pipeline wired correctly.
    """

    @property
    def service_name(self) -> str:
        return "placeholder"

    async def extract_frames(self, video_path: Path, num_frames: int = 3) -> List[bytes]:
        return []


class FFmpegFrameExtractionService(FrameExtractionService):
    """
    Extracts evenly-spaced JPEG frames from a video using ffmpeg/ffprobe.

    Steps:
    1. ffprobe to get video duration.
    2. Calculate evenly-spaced timestamps.
    3. Concurrently extract one JPEG frame per timestamp.

    Per-frame failures are logged and skipped (non-fatal). A complete ffprobe
    failure returns an empty list so the pipeline can continue without visual
    context.
    """

    @property
    def service_name(self) -> str:
        return "ffmpeg-frames"

    async def extract_frames(self, video_path: Path, num_frames: int = 3) -> List[bytes]:
        duration = await self._get_duration(video_path)
        if duration is None:
            logger.warning("ffprobe could not determine duration for %s — skipping frames", video_path.name)
            return []

        if duration < _SHORT_VIDEO_SECONDS:
            timestamps = [duration / 2.0]
        else:
            timestamps = [
                duration * i / (num_frames + 1)
                for i in range(1, num_frames + 1)
            ]

        results = await asyncio.gather(
            *[self._extract_frame(video_path, ts) for ts in timestamps],
            return_exceptions=True,
        )

        frames: List[bytes] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(
                    "Frame extraction failed at timestamp %.2fs for %s: %s",
                    timestamps[i],
                    video_path.name,
                    result,
                )
            elif result:
                frames.append(result)

        return frames

    async def _get_duration(self, video_path: Path) -> float | None:
        """Run ffprobe and return the video duration in seconds."""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            str(video_path),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await proc.communicate()

        if proc.returncode != 0 or not stdout:
            return None

        try:
            data = json.loads(stdout)
            return float(data["format"]["duration"])
        except (KeyError, ValueError, json.JSONDecodeError):
            return None

    async def _extract_frame(self, video_path: Path, timestamp: float) -> bytes:
        """Extract a single JPEG frame at the given timestamp."""
        cmd = [
            "ffmpeg",
            "-ss", f"{timestamp:.3f}",
            "-i", str(video_path),
            "-frames:v", "1",
            "-f", "image2pipe",
            "-vcodec", "mjpeg",
            "-q:v", "5",       # JPEG quality (2=best, 31=worst); 5 balances size vs quality
            "pipe:1",
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await proc.communicate()

        if proc.returncode != 0 or not stdout:
            raise RuntimeError(
                f"ffmpeg returned exit code {proc.returncode} for timestamp {timestamp:.3f}s"
            )

        return stdout


def create_frame_extraction_service(
    service_type: str = "ffmpeg",
) -> FrameExtractionService:
    """Factory: returns a FrameExtractionService based on service_type."""
    if service_type == "ffmpeg":
        return FFmpegFrameExtractionService()
    return PlaceholderFrameExtractionService()
