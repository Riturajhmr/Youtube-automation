from __future__ import annotations

import asyncio
import logging
import re
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path

logger = logging.getLogger(__name__)

# Returned when Whisper finds no speech (e.g. music-only video).
# Must be >= 50 chars to satisfy MetadataGenerateRequest.transcript min_length.
_MUSIC_VIDEO_FALLBACK = (
    "[Music video — no spoken dialogue detected in audio track.]"
)

# Whisper segments with no_speech_prob >= this threshold are filtered out.
_NO_SPEECH_THRESHOLD = 0.6


class TranscriptService(ABC):
    @abstractmethod
    async def extract(self, video_path: Path, video_id: str) -> str:
        """Extract or generate a transcript string from a video file."""

    @property
    @abstractmethod
    def service_name(self) -> str:
        """Human-readable name of this service."""


class PlaceholderTranscriptService(TranscriptService):
    """
    Returns a deterministic stub transcript derived from the filename.

    Guaranteed ≥50 characters (MetadataGenerateRequest.transcript min_length).
    Swap this out for a real Whisper-based implementation without touching the pipeline.
    """

    @property
    def service_name(self) -> str:
        return "placeholder"

    async def extract(self, video_path: Path, video_id: str) -> str:
        stem = video_path.stem
        humanized = re.sub(r"[_\-]+", " ", stem).strip()
        transcript = (
            f"Placeholder transcript for video: {stem}. "
            f"This video covers topics related to {humanized}. "
            f"Content analysis is pending real transcript extraction. "
            f"Video ID: {video_id}."
        )
        while len(transcript) < 50:
            transcript += " Additional placeholder content."
        return transcript


class WhisperTranscriptService(TranscriptService):
    """
    Extracts speech from video using faster-whisper (CTranslate2-based ASR).

    Audio extraction: ffmpeg converts the video to a 16 kHz mono WAV in a
    temporary file. Whisper then transcribes it in a thread-pool executor so
    the async event loop is not blocked.

    Music-video handling: segments with no_speech_prob >= 0.6 are discarded.
    If the surviving text is < 50 characters, a music-video fallback string is
    returned instead of failing.
    """

    def __init__(self, model_size: str = "base") -> None:
        self._model_size = model_size
        try:
            from faster_whisper import WhisperModel  # type: ignore[import-untyped]
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper is not installed. Run: pip install 'faster-whisper>=1.0.0'"
            ) from exc
        # Load model once at init (CPU, int8 quantisation for speed).
        # On first call this will download the model weights (~148 MB for "base").
        self._model = WhisperModel(model_size, device="cpu", compute_type="int8")

    @property
    def service_name(self) -> str:
        return f"whisper-{self._model_size}"

    async def extract(self, video_path: Path, video_id: str) -> str:
        loop = asyncio.get_event_loop()
        wav_path: Path | None = None
        try:
            wav_path = await self._extract_audio(video_path, video_id)
            transcript = await loop.run_in_executor(
                None, self._transcribe, wav_path
            )
            return transcript
        finally:
            if wav_path and wav_path.exists():
                try:
                    wav_path.unlink()
                except OSError:
                    logger.warning("Could not delete temp WAV file: %s", wav_path)

    async def _extract_audio(self, video_path: Path, video_id: str) -> Path:
        """Use ffmpeg to convert video to 16 kHz mono WAV in a temp file."""
        tmp = tempfile.NamedTemporaryFile(
            suffix=".wav",
            prefix=f"tubeflow_{video_id}_",
            delete=False,
        )
        tmp.close()
        wav_path = Path(tmp.name)

        cmd = [
            "ffmpeg",
            "-y",                          # overwrite without asking
            "-i", str(video_path),
            "-vn",                         # no video stream
            "-acodec", "pcm_s16le",        # 16-bit PCM
            "-ar", "16000",                # 16 kHz sample rate
            "-ac", "1",                    # mono
            str(wav_path),
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            err = stderr.decode(errors="replace").strip()
            raise RuntimeError(
                f"ffmpeg audio extraction failed (exit {proc.returncode}): {err}"
            )

        return wav_path

    def _transcribe(self, wav_path: Path) -> str:
        """Run Whisper inference synchronously (called in executor)."""
        segments_iter, _ = self._model.transcribe(
            str(wav_path),
            beam_size=5,
            vad_filter=True,
        )

        texts: list[str] = []
        for segment in segments_iter:
            if segment.no_speech_prob < _NO_SPEECH_THRESHOLD:
                texts.append(segment.text.strip())

        transcript = " ".join(texts).strip()

        if len(transcript) < 50:
            logger.info(
                "Whisper found no speech (transcript length %d) — using music fallback",
                len(transcript),
            )
            return _MUSIC_VIDEO_FALLBACK

        return transcript


def create_transcript_service(
    service_type: str = "whisper",
    whisper_model_size: str = "base",
) -> TranscriptService:
    """Factory: returns a TranscriptService based on service_type."""
    if service_type == "whisper":
        return WhisperTranscriptService(model_size=whisper_model_size)
    return PlaceholderTranscriptService()
