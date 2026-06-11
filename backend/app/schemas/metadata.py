from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChannelProfile(BaseModel):
    """Optional channel context that shapes niche detection and metadata tone."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    niche: Optional[str] = None
    tone: Optional[str] = None            # e.g. "casual" | "technical" | "authoritative"
    language: Optional[str] = None        # BCP-47 code, e.g. "en", "es"
    audience_size_tier: Optional[str] = None  # "small" | "medium" | "large"


class MetadataGenerateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    transcript: str = Field(min_length=50, max_length=50_000)
    title_hint: Optional[str] = Field(default=None, max_length=200)
    target_keywords: Optional[List[str]] = None
    channel_profile: Optional[ChannelProfile] = None
    video_description: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Creator's existing or draft description — used as additional context.",
    )
    extra_context: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Any additional notes the creator wants the AI to know (audience, tone, goals, etc.).",
    )

    @field_validator("target_keywords")
    @classmethod
    def deduplicate_keywords(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        seen: set[str] = set()
        deduped: List[str] = []
        for kw in v:
            normalised = kw.strip().lower()
            if normalised and normalised not in seen:
                seen.add(normalised)
                deduped.append(kw.strip())
        return deduped


class MetadataGenerateResponse(BaseModel):
    """
    Constraints here are YouTube's hard platform limits, not SEO guidelines.
    SEO best-practice targets (e.g. 50–70 char titles, 8–15 tags) live in the
    prompt so the AI aims for them — but we never reject a good response just
    because a title is 44 chars instead of 50.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    # YouTube hard limit: 100 chars. Minimum: non-empty.
    title: str = Field(min_length=1, max_length=100)

    # No YouTube-enforced minimum; require at least one meaningful sentence.
    description: str = Field(min_length=50, max_length=5000)

    # YouTube allows up to 30 tags; require at least 3 for any quality result.
    tags: List[str] = Field(min_length=3, max_length=30)

    @field_validator("tags")
    @classmethod
    def tags_no_duplicates(cls, v: List[str]) -> List[str]:
        normalised = [t.lower().strip() for t in v]
        if len(set(normalised)) != len(normalised):
            raise ValueError("Tags must not contain case-insensitive duplicates.")
        return v
