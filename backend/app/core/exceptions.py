from __future__ import annotations

from typing import Optional


class TubeFlowError(Exception):
    def __init__(self, message: str, code: str = "TUBEFLOW_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code

    def __str__(self) -> str:
        return self.message


class MetadataGenerationError(TubeFlowError):
    def __init__(
        self,
        message: str,
        code: str = "METADATA_GENERATION_ERROR",
        stage: Optional[str] = None,
    ) -> None:
        super().__init__(message, code)
        self.stage = stage


class VideoUploadError(TubeFlowError):
    """Raised for client-caused upload failures: bad extension, MIME type, size, empty, corrupt."""

    def __init__(
        self,
        message: str,
        code: str = "VIDEO_UPLOAD_ERROR",
    ) -> None:
        super().__init__(message, code)


class VideoProcessingError(TubeFlowError):
    """Raised when the server-side processing pipeline fails after a successful upload."""

    def __init__(
        self,
        message: str,
        code: str = "VIDEO_PROCESSING_ERROR",
        stage: Optional[str] = None,
    ) -> None:
        super().__init__(message, code)
        self.stage = stage


class AuthenticationError(TubeFlowError):
    def __init__(self, message: str, code: str = "AUTHENTICATION_ERROR") -> None:
        super().__init__(message, code)


class ConflictError(TubeFlowError):
    def __init__(self, message: str, code: str = "CONFLICT_ERROR") -> None:
        super().__init__(message, code)


class YouTubeCredentialError(TubeFlowError):
    """Raised for bad/missing credential input (400/409)."""

    def __init__(self, message: str, code: str = "YOUTUBE_CREDENTIAL_ERROR") -> None:
        super().__init__(message, code)


class YouTubeConnectionError(TubeFlowError):
    """Raised when the OAuth flow or YouTube API call fails (500)."""

    def __init__(self, message: str, code: str = "YOUTUBE_CONNECTION_ERROR") -> None:
        super().__init__(message, code)


class YouTubePublishError(TubeFlowError):
    """Raised when video publishing to YouTube fails."""

    def __init__(self, message: str, code: str = "YOUTUBE_PUBLISH_ERROR") -> None:
        super().__init__(message, code)


class YouTubePlaylistError(TubeFlowError):
    """Raised when playlist sync or YouTube Playlists API interaction fails."""

    def __init__(self, message: str, code: str = "YOUTUBE_PLAYLIST_ERROR") -> None:
        super().__init__(message, code)
