from __future__ import annotations

import os
import shutil
from contextlib import asynccontextmanager

# requests_oauthlib raises a fatal Warning when Google returns additional
# previously-granted scopes alongside the requested scope. The token is valid;
# we just need to relax the strict scope comparison.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import InterfaceError, OperationalError
from starlette.requests import Request

from app.api.routes import metadata as metadata_routes
from app.api.routes import video as video_routes
from app.api.routes import auth as auth_routes
from app.api.routes import youtube as youtube_routes
from app.api.routes import history as history_routes
from app.api.routes import workflow as workflow_routes
from app.core.config import get_settings
from app.core.exceptions import (
    AuthenticationError,
    MetadataGenerationError,
    VideoProcessingError,
    VideoUploadError,
    YouTubeConnectionError,
    YouTubeCredentialError,
    YouTubePublishError,
)
from app.core.logging import get_logger, setup_logging
from app.middleware.request_id import RequestIDMiddleware
from app.schemas.health import HealthResponse
from app.services.ai_provider import ProviderConfig, create_provider
from app.services.content_type_service import ContentTypeService
from app.services.frame_extraction_service import create_frame_extraction_service
from app.services.metadata_engine import MetadataEngine
from app.services.transcript_service import create_transcript_service
from app.services.video_processing_service import VideoProcessingService
from app.services.video_upload_service import VideoUploadService

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Module-level exception handlers (M5 — not nested closures, fully testable)
# ---------------------------------------------------------------------------

async def _handle_metadata_generation_error(
    request: Request, exc: MetadataGenerationError
) -> JSONResponse:
    logger.error(
        "Metadata generation error",
        extra={"code": exc.code, "stage": exc.stage, "exc_message": exc.message},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,  # C2: server-side failure, not a client input error
        content={
            "error": "Metadata generation failed",  # M1: brief label
            "detail": exc.message,                  # M1: specific technical context
            "code": exc.code,
        },
    )


async def _handle_request_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "detail": str(exc),
            "code": "VALIDATION_ERROR",
        },
    )


async def _handle_video_upload_error(
    request: Request, exc: VideoUploadError
) -> JSONResponse:
    logger.warning(
        "Video upload validation error",
        extra={"code": exc.code, "exc_message": exc.message},
        exc_info=True,
    )
    return JSONResponse(
        status_code=400,
        content={
            "error": "Video upload failed",
            "detail": exc.message,
            "code": exc.code,
        },
    )


async def _handle_video_processing_error(
    request: Request, exc: VideoProcessingError
) -> JSONResponse:
    logger.error(
        "Video processing error",
        extra={"code": exc.code, "stage": exc.stage, "exc_message": exc.message},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Video processing failed",
            "detail": exc.message,
            "code": exc.code,
        },
    )


async def _handle_authentication_error(
    request: Request, exc: AuthenticationError
) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"error": "Unauthorized", "detail": exc.message, "code": exc.code},
    )


async def _handle_generic_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": "An unexpected error occurred.",
            "code": "INTERNAL_ERROR",
        },
    )


async def _handle_db_error(request: Request, exc: Exception) -> JSONResponse:
    """Return a clean 503 for database connection/operational errors.

    Catches these before they reach Starlette's ServerErrorMiddleware so that
    CORS headers are still present on the response (the middleware chain
    processes the JSONResponse returned here, not a raw exception).
    """
    logger.error(
        "Database error",
        extra={"exc_type": type(exc).__name__, "exc_detail": str(exc)[:300]},
        exc_info=True,
    )
    return JSONResponse(
        status_code=503,
        content={
            "error": "Database unavailable",
            "detail": (
                "The server could not connect to the database. "
                "Check DATABASE_URL in .env and ensure PostgreSQL is running."
            ),
            "code": "DB_CONNECTION_ERROR",
        },
    )


async def _handle_youtube_credential_error(
    request: Request, exc: YouTubeCredentialError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "YouTube credential error", "detail": exc.message, "code": exc.code},
    )


async def _handle_youtube_connection_error(
    request: Request, exc: YouTubeConnectionError
) -> JSONResponse:
    logger.error(
        "YouTube connection error",
        extra={"code": exc.code, "exc_message": exc.message},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "YouTube connection failed", "detail": exc.message, "code": exc.code},
    )


async def _handle_youtube_publish_error(
    request: Request, exc: YouTubePublishError
) -> JSONResponse:
    logger.error(
        "YouTube publish error",
        extra={"code": exc.code, "exc_message": exc.message},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "YouTube publish failed", "detail": exc.message, "code": exc.code},
    )


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        setup_logging(settings.LOG_LEVEL)

        # Warn early if ffmpeg is missing — both Whisper and frame extraction need it.
        if not shutil.which("ffmpeg"):
            logger.warning(
                "ffmpeg binary not found on PATH — transcript and frame extraction "
                "will fail at request time. Install ffmpeg or set "
                "TRANSCRIPT_SERVICE=placeholder and FRAME_EXTRACTION_SERVICE=placeholder."
            )

        # C1: create provider and engine once; store as app-level singletons.
        # This allows httpx connection pools to be reused across requests.
        provider_config = ProviderConfig(
            provider_type=settings.AI_PROVIDER,
            openai_api_key=settings.OPENAI_API_KEY,
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            model="claude-sonnet-4-6",
        )
        app.state.ai_provider = create_provider(provider_config)
        app.state.metadata_engine = MetadataEngine(ai_provider=app.state.ai_provider)

        # Video pipeline singletons (created after metadata_engine — it's a dependency)
        app.state.transcript_service = create_transcript_service(
            service_type=settings.TRANSCRIPT_SERVICE,
            whisper_model_size=settings.WHISPER_MODEL_SIZE,
        )
        app.state.frame_extraction_service = create_frame_extraction_service(
            service_type=settings.FRAME_EXTRACTION_SERVICE,
        )
        app.state.video_upload_service = VideoUploadService()
        app.state.content_type_service = ContentTypeService()
        app.state.video_processing_service = VideoProcessingService(
            upload=app.state.video_upload_service,
            transcript=app.state.transcript_service,
            frames=app.state.frame_extraction_service,
            engine=app.state.metadata_engine,
            content_type=app.state.content_type_service,
        )

        logger.info(
            "TubeFlow starting",
            extra={
                "version": settings.APP_VERSION,
                "provider": settings.AI_PROVIDER,
                "transcript_service": settings.TRANSCRIPT_SERVICE,
                "frame_extraction_service": settings.FRAME_EXTRACTION_SERVICE,
            },
        )
        yield
        logger.info("TubeFlow shutting down")

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered YouTube metadata generation engine.",
        lifespan=lifespan,
    )

    # --- Middleware (last registered = outermost = first to run) ---

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIDMiddleware)  # H5: outermost — runs before CORS

    # --- Routers ---

    app.include_router(auth_routes.router, prefix="/api/v1")
    app.include_router(metadata_routes.router, prefix="/api/v1")
    app.include_router(video_routes.router, prefix="/api/v1")
    app.include_router(youtube_routes.router, prefix="/api/v1")
    app.include_router(history_routes.router, prefix="/api/v1")
    app.include_router(workflow_routes.router, prefix="/api/v1")

    # Serve uploaded files (thumbnails, etc.) at /uploads/<filename>
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    # --- Health ---

    @app.get("/health", response_model=HealthResponse, tags=["Health"], summary="Health check")
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            version=settings.APP_VERSION,
            service=settings.APP_NAME,
        )

    # --- Exception handlers (M5: registered via add_exception_handler, not decorators) ---

    app.add_exception_handler(AuthenticationError, _handle_authentication_error)  # type: ignore[arg-type]
    app.add_exception_handler(MetadataGenerationError, _handle_metadata_generation_error)  # type: ignore[arg-type]
    app.add_exception_handler(VideoUploadError, _handle_video_upload_error)  # type: ignore[arg-type]
    app.add_exception_handler(VideoProcessingError, _handle_video_processing_error)  # type: ignore[arg-type]
    app.add_exception_handler(YouTubeCredentialError, _handle_youtube_credential_error)  # type: ignore[arg-type]
    app.add_exception_handler(YouTubeConnectionError, _handle_youtube_connection_error)  # type: ignore[arg-type]
    app.add_exception_handler(YouTubePublishError, _handle_youtube_publish_error)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _handle_request_validation_error)  # type: ignore[arg-type]
    app.add_exception_handler(OperationalError, _handle_db_error)  # type: ignore[arg-type]
    app.add_exception_handler(InterfaceError, _handle_db_error)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _handle_generic_error)  # type: ignore[arg-type]

    return app


app = create_app()
