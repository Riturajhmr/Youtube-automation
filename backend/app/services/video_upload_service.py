from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Tuple

import aiofiles
from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import VideoUploadError
from app.core.logging import get_logger

logger = get_logger(__name__)

_ALLOWED_EXTENSIONS: frozenset[str] = frozenset({"mp4", "mov", "mkv", "webm"})
_ALLOWED_CONTENT_TYPES: frozenset[str] = frozenset({
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",   # Chrome, Safari, most desktop OS
    "video/matroska",     # Firefox on Linux/Windows, some cross-platform tools
    "video/webm",
})
_WEBM_MKV_MAGIC: bytes = b"\x1A\x45\xDF\xA3"
_MP4_MOV_BOX_TYPES: frozenset[bytes] = frozenset({b"ftyp", b"free", b"mdat", b"wide"})
_CHUNK_SIZE: int = 1024 * 1024  # 1 MB per read chunk


class VideoUploadService:
    def __init__(self) -> None:
        settings = get_settings()
        self._upload_dir = Path(settings.UPLOAD_DIR)
        self._max_bytes = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
        self._upload_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file: UploadFile) -> Tuple[str, Path]:
        """
        Validate and persist an uploaded video file.

        Returns:
            (video_id, saved_path)

        Raises:
            VideoUploadError: on validation or I/O failure.
        """
        self._check_extension(file.filename or "")
        self._check_content_type(file.content_type or "")

        content = await self._read_with_size_limit(file)
        self._check_not_empty(content)
        self._check_magic_bytes(content, file.filename or "")

        video_id = str(uuid.uuid4())
        safe_name = _sanitize_filename(file.filename or "upload")
        dest = self._upload_dir / f"{video_id}_{safe_name}"

        try:
            async with aiofiles.open(dest, "wb") as f:
                await f.write(content)
        except OSError as exc:
            raise VideoUploadError(
                message=f"Failed to save uploaded file: {exc}",
                code="VIDEO_SAVE_ERROR",
            ) from exc

        logger.info(
            "Video saved",
            extra={"video_id": video_id, "video_filename": safe_name, "size_bytes": len(content)},
        )
        return video_id, dest

    # --- Validation helpers ---

    def _check_extension(self, filename: str) -> None:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in _ALLOWED_EXTENSIONS:
            raise VideoUploadError(
                message=f"Unsupported file extension '.{ext}'. Allowed: {sorted(_ALLOWED_EXTENSIONS)}",
                code="VIDEO_INVALID_EXTENSION",
            )

    def _check_content_type(self, content_type: str) -> None:
        base_ct = content_type.split(";")[0].strip().lower()
        if base_ct not in _ALLOWED_CONTENT_TYPES:
            raise VideoUploadError(
                message=f"Unsupported content type '{base_ct}'.",
                code="VIDEO_INVALID_CONTENT_TYPE",
            )

    async def _read_with_size_limit(self, file: UploadFile) -> bytes:
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = await file.read(_CHUNK_SIZE)
            if not chunk:
                break
            total += len(chunk)
            if total > self._max_bytes:
                raise VideoUploadError(
                    message=f"File exceeds the {get_settings().MAX_VIDEO_SIZE_MB} MB size limit.",
                    code="VIDEO_TOO_LARGE",
                )
            chunks.append(chunk)
        return b"".join(chunks)

    def _check_not_empty(self, content: bytes) -> None:
        if not content:
            raise VideoUploadError(
                message="Uploaded file is empty.",
                code="VIDEO_EMPTY_FILE",
            )

    def _check_magic_bytes(self, content: bytes, filename: str) -> None:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in {"webm", "mkv"}:
            if content[:4] != _WEBM_MKV_MAGIC:
                raise VideoUploadError(
                    message="File content does not match the declared WebM/MKV format.",
                    code="VIDEO_CORRUPT_FILE",
                )
        elif ext in {"mp4", "mov"}:
            box_type = content[4:8] if len(content) >= 8 else b""
            if box_type not in _MP4_MOV_BOX_TYPES:
                raise VideoUploadError(
                    message="File content does not match the declared MP4/MOV format.",
                    code="VIDEO_CORRUPT_FILE",
                )


def _sanitize_filename(filename: str) -> str:
    """Replace characters unsafe for file paths with underscores."""
    name = re.sub(r"[^\w.\-]", "_", filename)
    return re.sub(r"_+", "_", name)
