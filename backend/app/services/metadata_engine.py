from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from typing import List, Literal, Optional

from pydantic import ValidationError

from app.core.exceptions import MetadataGenerationError
from app.core.logging import get_logger
from app.prompts.metadata_prompt import build_metadata_prompt
from app.schemas.metadata import ChannelProfile, MetadataGenerateRequest, MetadataGenerateResponse
from app.services.ai_provider import AIProvider

logger = get_logger(__name__)

AudienceIntent = Literal["informational", "instructional", "evaluative", "inspirational"]

_PROVIDER_TIMEOUT_SECONDS = 60.0

_NICHE_SIGNALS: dict[str, tuple[str, ...]] = {
    "programming": (
        "code", "function", "api", "python", "javascript", "typescript",
        "framework", "library", "deploy", "database", "class", "method",
        "variable", "algorithm", "backend", "frontend", "debugging",
    ),
    "business": (
        "revenue", "startup", "marketing", "customer", "strategy", "growth",
        "product", "sales", "entrepreneur", "funding", "investor",
        "management", "operations", "brand", "conversion", "retention",
    ),
    "finance": (
        "invest", "stock", "portfolio", "dividend", "budget", "savings",
        "income", "asset", "market", "crypto", "trading", "fund",
        "retirement", "debt", "compound", "inflation",
    ),
    "education": (
        "learn", "study", "lesson", "course", "explain", "understand",
        "concept", "theory", "exam", "student", "teacher", "curriculum",
        "subject", "lecture", "knowledge", "practice",
    ),
    "fitness": (
        "workout", "exercise", "muscle", "training", "calories", "weight",
        "cardio", "nutrition", "diet", "strength", "reps", "gym",
        "protein", "health", "routine",
    ),
    "gaming": (
        "game", "player", "level", "boss", "character", "strategy",
        "score", "gameplay", "quest", "weapon", "multiplayer",
        "console", "stream", "gaming", "esport",
    ),
    "lifestyle": (
        "morning", "routine", "travel", "productivity", "habit",
        "minimalism", "relationship", "balance", "journal",
        "creative", "wellness", "mindset", "personal",
    ),
    "music": (
        "song", "music", "album", "track", "lyrics", "beat", "melody",
        "chorus", "verse", "singer", "artist", "remix", "playlist",
        "official", "audio", "instrumental",
    ),
}

# --- Context Prioritization Layer signal tables ---

_CONTENT_TYPE_SIGNALS: dict[str, tuple[str, ...]] = {
    "music": (
        "song", "music video", "music", "album", "track", "lyrics", "beat",
        "melody", "chorus", "verse", "official video", "audio", "instrumental",
        "cover", "remix", "singer", "artist", "feat", "ft.", "prod.",
    ),
    "tutorial": (
        "tutorial", "how to", "guide", "step by step", "walkthrough",
        "beginner", "getting started", "setup", "install", "learn", "course",
    ),
    "vlog": (
        "vlog", "day in my life", "come with me", "daily", "behind the scenes",
        "week in my life", "travel", "routine", "haul",
    ),
    "review": (
        "review", " vs ", "comparison", "honest review", "unboxing",
        "first impressions", "worth it", "should you buy",
    ),
    "gaming": (
        "gameplay", "playthrough", "let's play", "lets play", "gaming",
        "highlights", "best plays", "clutch",
    ),
}

_MOOD_SIGNALS: dict[str, tuple[str, ...]] = {
    "emotional": ("emotional", "sad", "heartbreak", "touching", "moving", "feelings", "tears", "dil"),
    "romantic": ("romantic", "love", "romance", "sweet", "tender", "passionate", "ishq", "mohabbat", "pyar"),
    "energetic": ("energetic", "hype", "pump", "exciting", "intense", "fire", "banger", "upbeat"),
    "calm": ("calm", "relaxing", "chill", "peaceful", "ambient", "lofi", "study", "sleep"),
    "motivational": ("motivat", "inspiring", "uplift", "powerful", "determined", "hustle"),
    "nostalgic": ("nostalgic", "memories", "throwback", "old school", "classic", "yaadein"),
    "devotional": ("devotional", "spiritual", "prayer", "bhajan", "nasheed", "qawwali"),
}

_LANGUAGE_SIGNALS: dict[str, tuple[str, ...]] = {
    "ur": ("urdu", "urdu song", "urdu music", "pakistani", "pakistan"),
    "hi": ("hindi", "hindi song", "bollywood", "hindi music", "india", "desi"),
    "es": ("spanish", "espanol", "canción", "música"),
    "fr": ("french", "français", "chanson"),
    "ar": ("arabic", "arab music"),
    "pt": ("portuguese", "português"),
    "de": ("german", "deutsch"),
    "ko": ("korean", "k-pop", "kpop"),
    "ja": ("japanese", "j-pop", "jpop"),
}

_MUSIC_GENRE_SIGNALS: dict[str, tuple[str, ...]] = {
    "romantic": ("romantic", "love song", "romance", "love", "ishq", "mohabbat", "pyar"),
    "devotional": ("devotional", "bhajan", "qawwali", "nasheed", "prayer", "spiritual"),
    "hip-hop": ("hip hop", "hip-hop", "rap", "rapper", "drill"),
    "classical": ("classical", "instrumental", "raag", "orchestral"),
    "lofi": ("lofi", "lo-fi", "chill beats", "study music", "ambient"),
    "pop": ("pop song", "pop music"),
    "folk": ("folk", "traditional", "desi", "regional"),
    "sad": ("sad song", "heartbreak", "breakup", "lonely", "dard"),
}

_STOP_WORDS: frozenset[str] = frozenset({
    # Articles / conjunctions / prepositions
    "the", "and", "for", "that", "this", "with", "are", "was",
    "were", "have", "has", "had", "will", "would", "could", "should",
    "what", "when", "where", "which", "who", "how", "why", "from",
    "into", "about", "more", "some", "also", "just", "like", "then",
    "than", "their", "they", "them", "been", "each", "its", "our",
    "your", "very", "here", "there", "only", "over", "after", "before",
    "through", "during", "under", "while", "being",
    # Common transcript filler / preamble words
    "today", "going", "cover", "using", "okay", "right", "know",
    "come", "back", "time", "next", "look", "start", "need", "want",
    "make", "take", "give", "good", "well", "many", "much", "even",
    "away", "done", "used", "work", "long", "show", "talk", "walk",
    "lets", "let", "first", "last", "really", "actually", "basically",
    "gonna", "wanna", "things", "thing", "guys", "everyone", "something",
})

_KEYWORD_MIN_LENGTH: int = 4
_KEYWORD_MAX_EXTRACT: int = 10

# --- JSON repair helpers ---

_CTRL_ESCAPE_MAP: dict[str, str] = {
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
    "\b": "\\b",
    "\f": "\\f",
}
_TRAILING_COMMA_RE = re.compile(r",\s*([}\]])")
_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


def _escape_string_control_chars(text: str) -> str:
    """Scan JSON text and escape literal control characters found inside string values.

    LLMs sometimes emit multi-paragraph descriptions with literal newline bytes
    (0x0A) inside JSON string values instead of the escape sequence \\n.
    Standard json.loads rejects these as "Invalid control character".
    """
    result: list[str] = []
    in_string = False
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "\\" and in_string:
            # Pass through existing escape sequence unchanged.
            result.append(ch)
            i += 1
            if i < len(text):
                result.append(text[i])
                i += 1
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            i += 1
            continue
        if in_string and ord(ch) < 0x20:
            result.append(_CTRL_ESCAPE_MAP.get(ch, f"\\u{ord(ch):04x}"))
        else:
            result.append(ch)
        i += 1
    return "".join(result)


@dataclass(frozen=True)
class _ContentAnalysis:
    word_count: int
    estimated_duration_minutes: float
    vocab_complexity: str
    content_summary: str
    tokens: tuple[str, ...]  # lowercase cleaned tokens, capped at 2000 words


@dataclass(frozen=True)
class _PipelineContext:
    intent: AudienceIntent
    niche: str
    keywords: List[str]
    content: _ContentAnalysis


@dataclass
class ContentProfile:
    """
    Weighted content profile resolved from all inputs.

    Priority order: user description (P1) > title hint (P2) > target keywords (P3)
    > transcript (P4) > thumbnail (P5) > frames (P6).

    When user context and transcript conflict, user context wins.
    """
    content_type: str   # "music" | "tutorial" | "vlog" | "review" | "gaming" | "general"
    genre: str          # niche-specific sub-genre, e.g. "romantic" for music
    language: str       # BCP-47, e.g. "en", "ur", "hi"
    audience_intent: str
    mood: str           # "emotional" | "romantic" | "energetic" | "calm" | "neutral" etc.
    keywords: List[str]
    confidence: float   # 0.0–1.0, grows with each user-provided field
    source_breakdown: dict = field(default_factory=dict)


class MetadataEngine:
    def __init__(self, ai_provider: AIProvider) -> None:
        self._provider = ai_provider

    async def generate_metadata(
        self,
        request: MetadataGenerateRequest,
        frames: Optional[List[bytes]] = None,
    ) -> MetadataGenerateResponse:
        content = self._analyze_content(request.transcript)

        # Build the content profile — user context is applied here with priority ordering
        profile = self._build_content_profile(request, content, frames)

        user_signal = _user_signal_from_request(request)
        niche = self._detect_niche(content, request.channel_profile, user_signal)

        ctx = _PipelineContext(
            intent=profile.audience_intent,
            niche=niche,
            keywords=profile.keywords,
            content=content,
        )

        # Debug: log what user context was received and what profile was resolved
        self._log_context_and_profile(request, profile)

        channel_profile_json: Optional[str] = None
        if request.channel_profile:
            channel_profile_json = request.channel_profile.model_dump_json(indent=2)

        visual_context: Optional[str] = None
        if frames:
            n = len(frames)
            visual_context = (
                f"{n} frame{'s' if n != 1 else ''} extracted from the video "
                f"are included above as images."
            )

        prompt = build_metadata_prompt(
            transcript=request.transcript,
            intent=ctx.intent,
            niche=ctx.niche,
            keywords=ctx.keywords,
            duration_minutes=ctx.content.estimated_duration_minutes,
            title_hint=request.title_hint,
            channel_profile_json=channel_profile_json,
            visual_context=visual_context,
            video_description=request.video_description,
            extra_context=request.extra_context,
            content_type=profile.content_type,
            genre=profile.genre,
            mood=profile.mood,
            language=profile.language,
            target_keywords_raw=request.target_keywords,
        )

        logger.info(
            "Calling AI provider",
            extra={
                "provider": self._provider.provider_name,
                "niche": ctx.niche,
                "intent": ctx.intent,
                "content_type": profile.content_type,
                "mood": profile.mood,
                "frame_count": len(frames) if frames else 0,
            },
        )

        provider_kwargs: dict[str, object] = {}
        if frames:
            provider_kwargs["frames"] = frames

        try:
            raw_response = await asyncio.wait_for(
                self._provider.complete(prompt, **provider_kwargs),
                timeout=_PROVIDER_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as exc:
            raise MetadataGenerationError(
                message=f"AI provider did not respond within {_PROVIDER_TIMEOUT_SECONDS}s.",
                stage="generate_metadata",
            ) from exc

        return self._parse_response(raw_response)

    # --- Context Prioritization Layer ---

    def _build_content_profile(
        self,
        request: MetadataGenerateRequest,
        content: _ContentAnalysis,
        frames: Optional[List[bytes]] = None,
    ) -> ContentProfile:
        user_signal = _user_signal_from_request(request)
        transcript_signal = content.content_summary.lower()

        # P1–P3: user-provided text overrides transcript (P4) for content_type
        content_type = (
            self._detect_content_type(user_signal)
            or self._detect_content_type(transcript_signal)
            or "general"
        )

        genre = self._detect_genre(user_signal, content_type)

        # language: channel_profile explicit > user context > default "en"
        language = "en"
        if request.channel_profile and request.channel_profile.language:
            language = request.channel_profile.language
        else:
            detected = self._detect_language_from_text(user_signal)
            if detected:
                language = detected

        # intent: user context wins over transcript heuristic
        audience_intent: AudienceIntent = (
            self._detect_intent_from_text(user_signal)
            or self._detect_audience_intent(content)
        )

        mood = self._detect_mood(user_signal) or "neutral"

        # keywords: target_keywords (P3) > user text extraction (P1–P2) > transcript (P4)
        if request.target_keywords:
            keywords: List[str] = list(request.target_keywords)
        else:
            user_kw = self._extract_keywords_from_text(user_signal)
            keywords = user_kw or self._extract_keywords(content, None)

        provided_fields = sum([
            bool(request.video_description),
            bool(request.title_hint),
            bool(request.target_keywords),
            bool(request.extra_context),
        ])
        confidence = round(min(0.40 + provided_fields * 0.15, 0.95), 2)

        source_breakdown: dict[str, float] = {
            "user_context": 0.40 if request.video_description else 0.0,
            "title_hint": 0.20 if request.title_hint else 0.0,
            "target_keywords": 0.15 if request.target_keywords else 0.0,
            "transcript": 0.15,
            "thumbnail": 0.05,
            "frames": 0.05 if frames else 0.0,
        }

        return ContentProfile(
            content_type=content_type,
            genre=genre,
            language=language,
            audience_intent=audience_intent,
            mood=mood,
            keywords=keywords,
            confidence=confidence,
            source_breakdown=source_breakdown,
        )

    def _log_context_and_profile(
        self,
        request: MetadataGenerateRequest,
        profile: ContentProfile,
    ) -> None:
        breakdown_str = ", ".join(f"{k}={v:.2f}" for k, v in profile.source_breakdown.items())
        logger.debug(
            "Context prioritization resolved",
            extra={
                # USER CONTEXT
                "user_title_hint": request.title_hint or "(none)",
                "user_keywords": request.target_keywords or "(none)",
                "user_description_preview": (request.video_description or "(none)")[:200],
                # CONTENT PROFILE
                "profile_content_type": profile.content_type,
                "profile_genre": profile.genre or "(none)",
                "profile_language": profile.language,
                "profile_audience_intent": profile.audience_intent,
                "profile_mood": profile.mood,
                "profile_keywords": profile.keywords,
                "profile_confidence": profile.confidence,
                "profile_source_breakdown": breakdown_str,
            },
        )

    # --- Detection helpers (all operate on raw lowercase text) ---

    def _detect_content_type(self, text: str) -> Optional[str]:
        if not text:
            return None
        for ct, signals in _CONTENT_TYPE_SIGNALS.items():
            if any(sig in text for sig in signals):
                return ct
        return None

    def _detect_genre(self, user_text: str, content_type: str) -> str:
        if not user_text or content_type != "music":
            return ""
        for genre, signals in _MUSIC_GENRE_SIGNALS.items():
            if any(sig in user_text for sig in signals):
                return genre
        return ""

    def _detect_mood(self, text: str) -> Optional[str]:
        if not text:
            return None
        for mood, signals in _MOOD_SIGNALS.items():
            if any(sig in text for sig in signals):
                return mood
        return None

    def _detect_language_from_text(self, text: str) -> Optional[str]:
        if not text:
            return None
        for lang_code, signals in _LANGUAGE_SIGNALS.items():
            if any(sig in text for sig in signals):
                return lang_code
        return None

    def _detect_niche_from_user_text(self, user_text: str) -> Optional[str]:
        if not user_text:
            return None
        # Music check via content-type signals (single signal is sufficient for user text)
        if any(sig in user_text for sig in _CONTENT_TYPE_SIGNALS.get("music", ())):
            return "music"
        for niche, signals in _NICHE_SIGNALS.items():
            if any(sig in user_text for sig in signals):
                return niche
        return None

    def _detect_intent_from_text(self, text: str) -> Optional[AudienceIntent]:
        if not text:
            return None
        instructional = ("how to", "step by step", "tutorial", "guide", "learn", "build", "create", "install", "setup")
        evaluative = (" vs ", "compare", "best ", "review", "worth it", "should you")
        inspirational = ("motivat", "inspir", "journey", "transform", "changed my", "success story")
        if any(s in text for s in instructional):
            return "instructional"
        if any(s in text for s in evaluative):
            return "evaluative"
        if any(s in text for s in inspirational):
            return "inspirational"
        return None

    def _extract_keywords_from_text(self, text: str) -> List[str]:
        """Extract keyword candidates from raw user-provided text."""
        if not text:
            return []
        freq: dict[str, int] = {}
        for word in text.split():
            token = re.sub(r"[^a-z0-9]", "", word.lower())
            if len(token) >= _KEYWORD_MIN_LENGTH and token not in _STOP_WORDS:
                freq[token] = freq.get(token, 0) + 1
        return sorted(freq, key=lambda k: freq[k], reverse=True)[:_KEYWORD_MAX_EXTRACT]

    # --- Pipeline stages ---

    def _analyze_content(self, transcript: str) -> _ContentAnalysis:
        words = transcript.split()
        word_count = len(words)
        estimated_duration_minutes = round(word_count / 130, 1)

        avg_word_length = sum(len(w) for w in words) / max(word_count, 1)
        if avg_word_length >= 7:
            vocab_complexity = "advanced"
        elif avg_word_length >= 5:
            vocab_complexity = "intermediate"
        else:
            vocab_complexity = "basic"

        # Tokenize first 2000 words: lowercase, strip punctuation, drop empty strings
        raw_tokens = words[:2000]
        tokens: tuple[str, ...] = tuple(
            t for t in (
                re.sub(r"[^a-z0-9]", "", w.lower()) for w in raw_tokens
            ) if t
        )

        return _ContentAnalysis(
            word_count=word_count,
            estimated_duration_minutes=estimated_duration_minutes,
            vocab_complexity=vocab_complexity,
            content_summary=transcript[:300],
            tokens=tokens,
        )

    def _detect_audience_intent(self, content: _ContentAnalysis) -> AudienceIntent:
        summary = content.content_summary.lower()

        instructional_signals = (
            "how to", "step by step", "install", "configure",
            "build", "create", "set up", "implement",
        )
        evaluative_signals = (" vs ", "compare", "best ", "review", "should you", "worth it")
        inspirational_signals = ("motivat", "inspir", "success story", "transform", "journey", "changed my")

        if any(s in summary for s in instructional_signals):
            return "instructional"
        if any(s in summary for s in evaluative_signals):
            return "evaluative"
        if any(s in summary for s in inspirational_signals):
            return "inspirational"
        return "informational"

    def _detect_niche(
        self,
        content: _ContentAnalysis,
        channel_profile: Optional[ChannelProfile],
        user_signal: str = "",
    ) -> str:
        # P1: explicit channel profile niche (highest authority)
        if channel_profile and channel_profile.niche:
            return channel_profile.niche

        # P2: user-provided context (description + title hint + keywords)
        niche_from_user = self._detect_niche_from_user_text(user_signal)
        if niche_from_user:
            return niche_from_user

        # P3: transcript token frequency
        token_set = set(content.tokens)
        best_niche = "general"
        best_score = 0

        for niche, signals in _NICHE_SIGNALS.items():
            score = sum(1 for signal in signals if signal in token_set)
            if score > best_score:
                best_score = score
                best_niche = niche

        # Require at least 2 signal matches to avoid false positives
        return best_niche if best_score >= 2 else "general"

    def _extract_keywords(
        self,
        content: _ContentAnalysis,
        target_keywords: Optional[List[str]],
    ) -> List[str]:
        # Creator-supplied keywords always take priority
        if target_keywords:
            return target_keywords

        # Extract from transcript by frequency, filtering stop words and short tokens
        freq: dict[str, int] = {}
        for token in content.tokens:
            if len(token) >= _KEYWORD_MIN_LENGTH and token not in _STOP_WORDS:
                freq[token] = freq.get(token, 0) + 1

        sorted_keywords = sorted(freq, key=lambda k: freq[k], reverse=True)
        return sorted_keywords[:_KEYWORD_MAX_EXTRACT]

    def _validate_raw_metadata(self, data: dict) -> None:
        """
        Gate on YouTube's actual hard limits only — not SEO guidelines.
        Soft targets (50–70 char title, 8–15 tags) are prompt instructions, not rejections.
        """
        failures: list[str] = []

        title = data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            failures.append("title is missing or empty")
        elif len(title) > 100:
            failures.append(f"title exceeds YouTube's 100-character limit (got {len(title)})")

        description = data.get("description")
        if not description or not isinstance(description, str) or not description.strip():
            failures.append("description is missing or empty")
        elif len(description) < 50:
            failures.append(f"description is too short to be useful (got {len(description)} chars)")

        tags = data.get("tags")
        if not isinstance(tags, list):
            failures.append("tags must be a list")
        elif len(tags) < 3:
            failures.append(f"AI returned fewer than 3 tags (got {len(tags)}): {tags}")
        elif len(tags) > 30:
            failures.append(f"AI returned more than 30 tags (got {len(tags)})")

        if failures:
            logger.error(
                "Raw metadata pre-validation failed",
                extra={
                    "failures": failures,
                    "title_value": str(data.get("title", ""))[:120],
                    "tag_count": len(data["tags"]) if isinstance(data.get("tags"), list) else None,
                    "desc_len": len(data.get("description", "")) if isinstance(data.get("description"), str) else None,
                },
            )
            raise MetadataGenerationError(
                message=f"AI response failed pre-validation: {'; '.join(failures)}",
                stage="_validate_raw_metadata",
            )

    def _parse_response(self, raw: str) -> MetadataGenerateResponse:
        logger.debug(
            "RAW RESPONSE",
            extra={"raw_response_preview": raw[:2000], "raw_response_length": len(raw)},
        )

        cleaned = self._clean_raw(raw)

        # Attempt 1 — direct parse on cleaned text
        data = self._try_json_parse(cleaned)

        if data is None:
            primary_error = self._last_parse_error(cleaned)
            logger.warning(
                "PARSE FAILURE — primary parse failed, attempting repair",
                extra={
                    "parse_error": primary_error,
                    "cleaned_preview": cleaned[:500],
                },
            )

            repaired = self._repair_json(cleaned)
            logger.warning(
                "REPAIR ATTEMPT",
                extra={
                    "repair_changed_input": repaired != cleaned,
                    "repaired_preview": repaired[:500],
                },
            )

            # Attempt 2 — parse repaired text
            data = self._try_json_parse(repaired)

            if data is None:
                # Attempt 3 — extract first JSON object from surrounding prose
                data = self._extract_json_object(repaired)

        if data is None:
            logger.error(
                "FINAL RESULT — all parse attempts exhausted, raising error",
                extra={
                    "raw_response_preview": raw[:500],
                },
            )
            raise MetadataGenerationError(
                message=(
                    f"AI response could not be parsed as JSON. "
                    f"Primary error: {self._last_parse_error(cleaned)}. "
                    f"Response preview: {raw[:200]!r}"
                ),
                stage="_parse_response",
            )

        logger.debug(
            "PARSED RESPONSE",
            extra={
                "data_keys": list(data.keys()),
                "title_len": len(data.get("title", "")) if isinstance(data.get("title"), str) else None,
                "tag_count": len(data.get("tags", [])) if isinstance(data.get("tags"), list) else None,
                "desc_len": len(data.get("description", "")) if isinstance(data.get("description"), str) else None,
            },
        )

        # Pre-Pydantic gate: catches malformed responses with clear, actionable messages
        self._validate_raw_metadata(data)

        try:
            result = MetadataGenerateResponse(**data)
            logger.info(
                "FINAL RESULT — metadata generated successfully",
                extra={
                    "title_len": len(result.title),
                    "tag_count": len(result.tags),
                    "desc_len": len(result.description),
                },
            )
            return result
        except (ValueError, ValidationError) as exc:
            logger.error(
                "FINAL RESULT — Pydantic schema validation failed",
                extra={
                    "exc_type": type(exc).__name__,
                    "exc_detail": str(exc),
                    "title_value": str(data.get("title", ""))[:120],
                    "tag_count": len(data["tags"]) if isinstance(data.get("tags"), list) else None,
                    "desc_len": len(data.get("description", "")) if isinstance(data.get("description"), str) else None,
                },
                exc_info=True,
            )
            raise MetadataGenerationError(
                message=(
                    f"AI response does not match the expected metadata schema "
                    f"({type(exc).__name__}): {exc}"
                ),
                stage="_parse_response",
            ) from exc

    # --- Parse helpers ---

    @staticmethod
    def _clean_raw(raw: str) -> str:
        """Strip whitespace and markdown code fences emitted by some providers."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            lines = lines[1:]  # drop opening fence line (e.g. ```json)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        return cleaned

    @staticmethod
    def _try_json_parse(text: str) -> Optional[dict]:
        try:
            result = json.loads(text)
            return result if isinstance(result, dict) else None
        except json.JSONDecodeError:
            return None

    @staticmethod
    def _last_parse_error(text: str) -> str:
        try:
            json.loads(text)
            return "(no error)"
        except json.JSONDecodeError as exc:
            return str(exc)

    @staticmethod
    def _repair_json(text: str) -> str:
        """Apply layered repair strategies to malformed JSON.

        Strategy order:
        1. Escape literal control characters inside string values (most common LLM defect).
        2. Strip bare control characters that appear outside strings (NUL, BEL, etc.).
        3. Remove trailing commas before } or ] (another common LLM defect).
        """
        repaired = _escape_string_control_chars(text)
        repaired = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", repaired)
        repaired = _TRAILING_COMMA_RE.sub(r"\1", repaired)
        return repaired

    @staticmethod
    def _extract_json_object(text: str) -> Optional[dict]:
        """Extract and parse the first JSON object found in surrounding prose."""
        match = _JSON_OBJECT_RE.search(text)
        if match:
            try:
                result = json.loads(match.group())
                return result if isinstance(result, dict) else None
            except json.JSONDecodeError:
                return None
        return None


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _user_signal_from_request(request: MetadataGenerateRequest) -> str:
    """Aggregate all user-provided context into one lowercase string for signal detection."""
    parts: list[str] = []
    if request.video_description:
        parts.append(request.video_description.lower())
    if request.title_hint:
        parts.append(request.title_hint.lower())
    if request.extra_context:
        parts.append(request.extra_context.lower())
    if request.target_keywords:
        parts.extend(kw.lower() for kw in request.target_keywords)
    return " ".join(parts)
