from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import MetadataEngineDep
from app.schemas.metadata import MetadataGenerateRequest, MetadataGenerateResponse

router = APIRouter(prefix="/metadata", tags=["Metadata"])


@router.post(
    "/generate",
    response_model=MetadataGenerateResponse,
    status_code=200,
    summary="Generate YouTube metadata",
    description=(
        "Accepts a video transcript and optional context signals. "
        "Returns a professional title, description, and tags optimised for YouTube SEO."
    ),
)
async def generate_metadata(
    request: MetadataGenerateRequest,
    engine: MetadataEngineDep,
) -> MetadataGenerateResponse:
    return await engine.generate_metadata(request)
