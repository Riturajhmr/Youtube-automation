from __future__ import annotations

import asyncio
import json
import math
from dataclasses import dataclass
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

# 9:16 aspect ratio expressed as width/height = 0.5625
_SHORTS_ASPECT_RATIO = 9.0 / 16.0
# Allow ±5% tolerance for pixel rounding across resolutions
_ASPECT_RATIO_TOLERANCE = 0.05
# YouTube Shorts maximum duration in seconds
_SHORTS_MAX_DURATION = 180.0


@dataclass
class VideoMediaInfo:
    duration_seconds: float
    width: int
    height: int
    aspect_ratio: str   # simplified GCD ratio string, e.g. "9:16"
    content_type: str   # "video" | "short"


def _default_media_info() -> VideoMediaInfo:
    return VideoMediaInfo(
        duration_seconds=0.0,
        width=0,
        height=0,
        aspect_ratio="16:9",
        content_type="video",
    )


def _compute_aspect_ratio(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "unknown"
    gcd = math.gcd(width, height)
    return f"{width // gcd}:{height // gcd}"


def _classify(width: int, height: int, duration: float) -> str:
    if width <= 0 or height <= 0:
        return "video"
    ratio = width / height
    is_portrait_9_16 = abs(ratio - _SHORTS_ASPECT_RATIO) < _ASPECT_RATIO_TOLERANCE
    if is_portrait_9_16 and 0 < duration <= _SHORTS_MAX_DURATION:
        return "short"
    return "video"


class ContentTypeService:
    """
    Probes uploaded video files using ffprobe to extract dimensions and duration,
    then classifies the content as "video" or "short".

    Classification rule:
      aspect ratio ≈ 9:16  AND  duration ≤ 180 seconds  →  "short"
      anything else                                        →  "video"

    All failures are non-fatal and default to content_type="video".
    """

    async def analyze(self, video_path: Path) -> VideoMediaInfo:
        try:
            return await self._probe(video_path)
        except Exception as exc:
            logger.warning(
                "Content type detection failed (non-fatal), defaulting to 'video': %s",
                exc,
                extra={"video_path": str(video_path)},
            )
            return _default_media_info()

    async def _probe(self, video_path: Path) -> VideoMediaInfo:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            str(video_path),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await proc.communicate()

        if proc.returncode != 0 or not stdout:
            logger.warning(
                "ffprobe exited with code %d for %s",
                proc.returncode,
                video_path.name,
            )
            return _default_media_info()

        data = json.loads(stdout)
        video_stream = next(
            (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
            None,
        )
        if not video_stream:
            logger.warning("No video stream found in %s", video_path.name)
            return _default_media_info()

        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))

        # Duration may be on the stream or absent; fall back gracefully
        duration_str = video_stream.get("duration")
        try:
            duration = float(duration_str) if duration_str else 0.0
        except (ValueError, TypeError):
            duration = 0.0

        aspect_ratio = _compute_aspect_ratio(width, height)
        content_type = _classify(width, height, duration)

        logger.info(
            "Content type detected",
            extra={
                "video": video_path.name,
                "width": width,
                "height": height,
                "duration_seconds": duration,
                "aspect_ratio": aspect_ratio,
                "content_type": content_type,
            },
        )

        return VideoMediaInfo(
            duration_seconds=round(duration, 2),
            width=width,
            height=height,
            aspect_ratio=aspect_ratio,
            content_type=content_type,
        )
